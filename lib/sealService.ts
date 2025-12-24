// Seal Service - Business Logic Layer
import { StorageProvider } from "./storage";
import { DatabaseProvider } from "./database";
import { encryptKeyB, decryptKeyBWithFallback } from "./keyEncryption";
import {
  validateFileSize,
  validateUnlockTime,
  validatePulseInterval,
  validateSealAge,
} from "./validation";
import { logger, auditSealCreated, auditSealAccessed } from "./logger";
import { metrics } from "./metrics";
import { ErrorCode } from "./errors";
import { storageCircuitBreaker, withRetry } from "./circuitBreaker";
import {
  generatePulseToken,
  validatePulseToken,
  checkAndStoreNonce,
} from "./security";
import { sealEvents } from "./patterns/observer";
import {
  validateEphemeralConfig,
  recordViewAndCheck,
  getRemainingViews,
} from "./ephemeral";

export interface CreateSealRequest {
  encryptedBlob: ArrayBuffer;
  keyB: string;
  iv: string;
  unlockTime: number;
  isDMS?: boolean;
  pulseInterval?: number;
  unlockMessage?: string;
  expiresAfterDays?: number;
  // Ephemeral seal options
  isEphemeral?: boolean;
  maxViews?: number | null;
}

export interface SealMetadata {
  id: string;
  unlockTime: number;
  isDMS: boolean;
  status: "locked" | "unlocked" | "exhausted";
  keyB?: string;
  iv?: string;
  blobHash?: string;
  unlockMessage?: string;
  accessCount?: number;
  // Ephemeral seal metadata
  isEphemeral?: boolean;
  viewCount?: number;
  maxViews?: number | null;
  remainingViews?: number | null;
  firstViewedAt?: number | null;
  // CRITICAL: Blob included if fetched before deletion
  blob?: ArrayBuffer | null;
}

export interface SealReceipt {
  sealId: string;
  blobHash: string;
  unlockTime: number;
  createdAt: number;
  signature: string;
}

import { AuditLogger, AuditEventType } from "./auditLogger";

import { base64ToArrayBuffer } from "./cryptoUtils";

export class SealService {
  constructor(
    private storage: StorageProvider,
    private db: DatabaseProvider,
    private masterKey: string,
    private auditLogger?: AuditLogger,
  ) {
    if (!masterKey) {
      throw new Error("SealService requires masterKey");
    }
  }

  async createSeal(
    request: CreateSealRequest,
    ip: string,
  ): Promise<{
    sealId: string;
    iv: string;
    pulseToken?: string;
    receipt: SealReceipt;
  }> {
    const sizeValidation = validateFileSize(request.encryptedBlob.byteLength);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    // CRITICAL: Prevent ephemeral + DMS conflict
    if (request.isEphemeral && request.isDMS) {
      throw new Error("Seal cannot be both ephemeral and Dead Man's Switch");
    }

    // Skip unlock time validation for ephemeral seals (set to now)
    if (request.isEphemeral) {
      request.unlockTime = Date.now();
    } else {
      const timeValidation = validateUnlockTime(request.unlockTime);
      if (!timeValidation.valid) {
        throw new Error(timeValidation.error);
      }
    }

    if (request.isDMS) {
      if (!request.pulseInterval) {
        throw new Error("Dead Man's Switch requires pulse interval");
      }
      const pulseValidation = validatePulseInterval(request.pulseInterval);
      if (!pulseValidation.valid) {
        throw new Error(pulseValidation.error);
      }
    }

    // Validate ephemeral configuration
    if (request.isEphemeral) {
      const ephemeralValidation = validateEphemeralConfig({
        isEphemeral: request.isEphemeral,
        maxViews: request.maxViews || null,
      });
      if (!ephemeralValidation.valid) {
        throw new Error(ephemeralValidation.error);
      }
    }

    const sealId = this.generateSealId();
    const createdAt = Date.now();
    const pulseToken = request.isDMS
      ? await generatePulseToken(sealId, this.masterKey)
      : undefined;

    const encryptedKeyB = await encryptKeyB(
      request.keyB,
      this.masterKey,
      sealId,
    );

    // Generate cryptographic receipt
    const blobHash = await this.hashBlob(request.encryptedBlob);

    // Calculate expiration
    const expiresAt = request.expiresAfterDays
      ? request.unlockTime + request.expiresAfterDays * 24 * 60 * 60 * 1000
      : undefined;

    // Create seal with transaction-like rollback
    try {
      // Create seal record first
      await this.db.createSeal({
        id: sealId,
        unlockTime: request.unlockTime,
        isDMS: request.isDMS || false,
        pulseInterval: request.pulseInterval,
        lastPulse: request.isDMS ? createdAt : undefined,
        keyB: encryptedKeyB,
        iv: request.iv,
        pulseToken,
        createdAt,
        blobHash,
        unlockMessage: request.unlockMessage,
        expiresAt,
        accessCount: 0,
        // Ephemeral fields
        isEphemeral: request.isEphemeral || false,
        maxViews: request.maxViews !== undefined ? request.maxViews : null,
        viewCount: 0,
      });

      // Then upload blob (D1BlobStorage needs the row to exist)
      await storageCircuitBreaker.execute(() =>
        withRetry(
          () =>
            this.storage.uploadBlob(
              sealId,
              request.encryptedBlob,
              request.unlockTime,
            ),
          3,
          1000,
        ),
      );
    } catch (error) {
      // Rollback: delete database record if blob upload fails
      try {
        await this.db.deleteSeal(sealId);
      } catch (rollbackError) {
        logger.error("rollback_failed", rollbackError as Error, { sealId });
        // Critical: Both operations failed, throw compound error
        throw new Error(
          `Seal creation failed and rollback failed: ${(error as Error).message}`,
        );
      }
      throw error;
    }

    // Generate receipt after successful creation
    const receipt = await this.generateReceipt(
      sealId,
      blobHash,
      request.unlockTime,
      createdAt,
    );

    auditSealCreated(sealId, ip, request.isDMS || false);
    this.auditLogger?.log({
      timestamp: createdAt,
      eventType: AuditEventType.SEAL_CREATED,
      sealId,
      ip,
      metadata: {
        isDMS: request.isDMS,
        unlockTime: request.unlockTime,
        blobHash,
        isEphemeral: request.isEphemeral,
      },
    });
    metrics.incrementSealCreated();
    logger.info("seal_created", {
      sealId,
      isDMS: request.isDMS,
      isEphemeral: request.isEphemeral,
    });

    // Emit event for observers
    sealEvents.emit("seal:created", {
      sealId,
      isDMS: request.isDMS || false,
      ip,
    });

    return { sealId, iv: request.iv, pulseToken, receipt };
  }

  async getSeal(
    sealId: string,
    ip: string,
    fingerprint?: string,
  ): Promise<SealMetadata> {
    const seal = await this.db.getSeal(sealId);

    if (!seal) {
      throw new Error(ErrorCode.SEAL_NOT_FOUND);
    }

    // Check time FIRST to prevent timing attacks
    const now = Date.now();
    const isUnlocked = now >= seal.unlockTime;

    if (!isUnlocked) {
      auditSealAccessed(sealId, ip, "locked");
      this.auditLogger?.log({
        timestamp: now,
        eventType: AuditEventType.SEAL_ACCESS_DENIED,
        sealId,
        ip,
        metadata: { unlockTime: seal.unlockTime },
      });

      return {
        id: sealId,
        unlockTime: seal.unlockTime,
        isDMS: seal.isDMS,
        status: "locked",
        blobHash: seal.blobHash,
        accessCount: seal.accessCount,
        isEphemeral: seal.isEphemeral,
        maxViews: seal.maxViews || null,
        remainingViews: getRemainingViews(
          seal.isEphemeral || false,
          seal.viewCount || 0,
          seal.maxViews || null,
        ),
      };
    }

    // ATOMIC: Record view and check exhaustion (fixes race condition)
    const viewCheck = await recordViewAndCheck(
      this.db,
      sealId,
      fingerprint || "unknown",
      seal.isEphemeral || false,
      seal.viewCount || 0,
      seal.maxViews || null,
    );

    if (!viewCheck.allowed) {
      return {
        id: sealId,
        unlockTime: seal.unlockTime,
        isDMS: seal.isDMS,
        status: "exhausted",
        isEphemeral: true,
        viewCount: viewCheck.viewCount,
        maxViews: viewCheck.maxViews,
      };
    }

    // CRITICAL FIX: Fetch blob BEFORE incrementing access count
    // If fetch fails, we rollback the view count increment
    let blob: ArrayBuffer | null = null;
    try {
      blob = await storageCircuitBreaker.execute(() =>
        withRetry(() => this.storage.downloadBlob(sealId), 3, 1000),
      );
    } catch (error) {
      // Rollback view count if blob fetch fails
      if (seal.isEphemeral && viewCheck.viewCount > (seal.viewCount || 0)) {
        try {
          await this.db.decrementViewCount(sealId);
          logger.info("view_count_rollback_success", { sealId });
        } catch (rollbackError) {
          logger.error("view_count_rollback_failed", rollbackError as Error, {
            sealId,
          });
        }
      }
      logger.error("blob_fetch_failed", error as Error, { sealId });
      throw new Error(
        `Failed to fetch seal content: ${(error as Error).message}`,
      );
    }

    // Decrypt key
    const decryptedKeyB = await decryptKeyBWithFallback(seal.keyB, sealId, [
      this.masterKey,
    ]);
    metrics.incrementSealUnlocked();

    auditSealAccessed(sealId, ip, "unlocked");
    this.auditLogger?.log({
      timestamp: now,
      eventType: AuditEventType.SEAL_UNLOCKED,
      sealId,
      ip,
      metadata: { unlockTime: seal.unlockTime, isEphemeral: seal.isEphemeral },
    });

    // Delete if exhausted (DB first, then blob with rollback)
    if (viewCheck.shouldDelete) {
      let dbDeleted = false;
      try {
        await this.db.deleteSeal(sealId);
        dbDeleted = true;
      } catch (dbError) {
        logger.error("db_delete_failed", dbError as Error, { sealId });
        throw new Error("Failed to delete seal from database");
      }

      try {
        await this.storage.deleteBlob(sealId);
      } catch (error) {
        logger.error("blob_delete_failed", error as Error, { sealId });
        if (dbDeleted) {
          try {
            await this.db.createSeal({
              id: seal.id,
              unlockTime: seal.unlockTime,
              isDMS: seal.isDMS,
              pulseInterval: seal.pulseInterval,
              lastPulse: seal.lastPulse,
              keyB: seal.keyB,
              iv: seal.iv,
              pulseToken: seal.pulseToken,
              createdAt: seal.createdAt,
              blobHash: seal.blobHash,
              unlockMessage: seal.unlockMessage,
              expiresAt: seal.expiresAt,
              accessCount: seal.accessCount,
              isEphemeral: seal.isEphemeral,
              maxViews: seal.maxViews,
              viewCount: viewCheck.viewCount,
            });
            logger.info("db_rollback_success", { sealId });
          } catch (rollbackError) {
            logger.error("db_rollback_failed", rollbackError as Error, {
              sealId,
            });
          }
        }
        throw new Error("Failed to delete blob");
      }

      try {
        const { trackAnalytics } = await import("./apiHelpers");
        await trackAnalytics(this.db, "seal_deleted");
      } catch (error) {
        logger.error("analytics_track_failed", error as Error, { sealId });
      }

      sealEvents.emit("seal:exhausted", {
        sealId,
        viewCount: viewCheck.viewCount,
      });
    }

    // Increment access count only for non-ephemeral seals
    if (!seal.isEphemeral) {
      try {
        await this.db.incrementAccessCount(sealId);
      } catch (error) {
        logger.error("access_count_failed", error as Error, { sealId });
      }
    }

    sealEvents.emit("seal:unlocked", { sealId, ip });

    return {
      id: sealId,
      unlockTime: seal.unlockTime,
      isDMS: seal.isDMS,
      status: "unlocked",
      keyB: decryptedKeyB,
      iv: seal.iv,
      blobHash: seal.blobHash,
      unlockMessage: seal.unlockMessage,
      accessCount: seal.accessCount,
      isEphemeral: seal.isEphemeral,
      viewCount: viewCheck.viewCount,
      maxViews: viewCheck.maxViews,
      remainingViews: viewCheck.maxViews
        ? viewCheck.maxViews - viewCheck.viewCount
        : null,
      blob,
    };
  }

  async getBlob(sealId: string): Promise<ArrayBuffer> {
    return await storageCircuitBreaker.execute(() =>
      withRetry(() => this.storage.downloadBlob(sealId), 3, 1000),
    );
  }

  async pulseSeal(
    pulseToken: string,
    ip: string,
    newInterval?: number,
  ): Promise<{ newUnlockTime: number; newPulseToken: string }> {
    const parts = pulseToken.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid pulse token");
    }

    const [sealId, timestamp, nonce, signature] = parts;

    // Validate format strictly
    if (!sealId || !/^[a-f0-9]{32}$/.test(sealId)) {
      throw new Error("Invalid pulse token");
    }
    if (!timestamp) {
      throw new Error("Invalid pulse token");
    }
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || ts < 0 || ts.toString() !== timestamp) {
      throw new Error("Invalid pulse token");
    }
    if (
      !nonce ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        nonce,
      )
    ) {
      throw new Error("Invalid pulse token");
    }
    if (!signature) {
      throw new Error("Invalid pulse token");
    }

    // Check nonce FIRST (prevents replay)
    const nonceValid = await checkAndStoreNonce(nonce, this.db);
    if (!nonceValid) {
      throw new Error("Invalid pulse token");
    }

    // THEN validate token signature
    const isValid = await validatePulseToken(
      pulseToken,
      sealId,
      this.masterKey,
    );
    if (!isValid) {
      throw new Error("Invalid pulse token");
    }

    // Fetch seal AFTER validation to prevent timing attacks
    const seal = await this.db.getSeal(sealId);
    if (!seal || !seal.isDMS) {
      throw new Error("Invalid pulse token");
    }

    const now = Date.now();
    const intervalToUse = newInterval || seal.pulseInterval || 0;

    if (intervalToUse === 0) {
      throw new Error("Pulse interval not configured");
    }

    // Validate interval against max limit
    const intervalValidation = validatePulseInterval(intervalToUse);
    if (!intervalValidation.valid) {
      throw new Error(intervalValidation.error);
    }

    // Prevent infinite pulse (max seal age)
    const ageValidation = validateSealAge(seal.createdAt);
    if (!ageValidation.valid) {
      throw new Error(ageValidation.error);
    }

    const newUnlockTime = now + intervalToUse;
    const newPulseToken = await generatePulseToken(sealId, this.masterKey);

    // Atomic update (both or neither) - throws if seal deleted
    await this.db.updatePulseAndUnlockTime(seal.id, now, newUnlockTime);
    
    metrics.incrementPulseReceived();
    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: AuditEventType.PULSE_UPDATED,
      sealId: seal.id,
      ip,
      metadata: { newUnlockTime },
    });
    logger.info("pulse_received", { sealId: seal.id, newUnlockTime });

    // Emit event for observers
    sealEvents.emit("pulse:received", { sealId: seal.id, ip });

    return { newUnlockTime, newPulseToken };
  }

  async unlockSeal(pulseToken: string, ip: string): Promise<void> {
    const parts = pulseToken.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid pulse token");
    }

    const [sealId, , nonce] = parts;

    if (!sealId || !nonce) {
      throw new Error("Invalid pulse token");
    }

    // Check nonce FIRST (prevents replay)
    const nonceValid = await checkAndStoreNonce(nonce, this.db);
    if (!nonceValid) {
      throw new Error("Invalid pulse token");
    }

    // THEN validate token signature
    const isValid = await validatePulseToken(
      pulseToken,
      sealId,
      this.masterKey,
    );
    if (!isValid) {
      throw new Error("Invalid pulse token");
    }

    const seal = await this.db.getSeal(sealId);
    if (!seal || !seal.isDMS) {
      throw new Error("Invalid pulse token");
    }

    const now = Date.now();

    // Set unlock time to now (immediate unlock)
    try {
      await this.db.updatePulseAndUnlockTime(seal.id, now, now);
    } catch (error) {
      logger.error("unlock_update_failed", error as Error, { sealId: seal.id });
      throw error;
    }

    this.auditLogger?.log({
      timestamp: now,
      eventType: AuditEventType.SEAL_UNLOCKED,
      sealId,
      ip,
      metadata: { unlockedEarly: true },
    });
    logger.info("seal_unlocked_early", { sealId });

    // Emit event for observers
    sealEvents.emit("seal:unlocked", { sealId, ip });
  }

  async burnSeal(pulseToken: string, ip: string): Promise<void> {
    const parts = pulseToken.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid pulse token");
    }

    const [sealId, , nonce] = parts;

    if (!sealId || !nonce) {
      throw new Error("Invalid pulse token");
    }

    // Check nonce FIRST (prevents replay)
    const nonceValid = await checkAndStoreNonce(nonce, this.db);
    if (!nonceValid) {
      throw new Error("Invalid pulse token");
    }

    // THEN validate token signature
    const isValid = await validatePulseToken(
      pulseToken,
      sealId,
      this.masterKey,
    );
    if (!isValid) {
      throw new Error("Invalid pulse token");
    }

    const seal = await this.db.getSeal(sealId);
    if (!seal || !seal.isDMS) {
      throw new Error("Invalid pulse token");
    }

    // Delete DB first, then blob
    try {
      await this.db.deleteSeal(sealId);
    } catch (dbError) {
      logger.error("db_delete_failed", dbError as Error, { sealId });
      throw dbError;
    }

    try {
      await this.storage.deleteBlob(sealId);
    } catch (storageError) {
      logger.error("blob_delete_failed", storageError as Error, { sealId });
    }

    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: AuditEventType.SEAL_DELETED,
      sealId,
      ip,
      metadata: { burned: true },
    });
    logger.info("seal_burned", { sealId });

    // Track deletion in analytics
    try {
      const { trackAnalytics } = await import("./apiHelpers");
      await trackAnalytics(this.db, "seal_deleted");
    } catch (error) {
      logger.error("analytics_track_failed", error as Error, { sealId });
    }

    // Emit event for observers
    sealEvents.emit("seal:deleted", { sealId });
  }

  private generateSealId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async hashBlob(blob: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", blob);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async generateReceipt(
    sealId: string,
    blobHash: string,
    unlockTime: number,
    createdAt: number,
  ): Promise<SealReceipt> {
    const data = `${sealId}:${blobHash}:${unlockTime}:${createdAt}`;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.masterKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data),
    );
    const sigArray = Array.from(new Uint8Array(signature));
    const sigHex = sigArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return { sealId, blobHash, unlockTime, createdAt, signature: sigHex };
  }
}
