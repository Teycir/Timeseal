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
import { ErrorTracker } from "./errorTracker";
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

    // Validate ephemeral configuration (FIX #5: Use ?? instead of ||)
    if (request.isEphemeral) {
      const ephemeralValidation = validateEphemeralConfig({
        isEphemeral: request.isEphemeral,
        maxViews: request.maxViews ?? null,
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

    // FIX #3: Wrap entire creation in try-catch with full rollback
    let dbCreated = false;
    let blobUploaded = false;
    
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
      dbCreated = true;

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
      blobUploaded = true;

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
    } catch (error) {
      ErrorTracker.trackError(error as Error, {
        action: 'create_seal',
        sealId,
        isDMS: request.isDMS,
        isEphemeral: request.isEphemeral,
      });
      // Rollback in reverse order
      if (blobUploaded) {
        try {
          await this.storage.deleteBlob(sealId);
        } catch (blobError) {
          logger.error("blob_rollback_failed", blobError as Error, { sealId });
        }
      }
      if (dbCreated) {
        try {
          await this.db.deleteSeal(sealId);
        } catch (dbError) {
          logger.error("db_rollback_failed", dbError as Error, { sealId });
        }
      }
      throw new Error(`Seal creation failed: ${(error as Error).message}`);
    }
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

    // FIX #1: Fetch blob BEFORE recording view to prevent consuming views on failure
    let blob: ArrayBuffer | null = null;
    try {
      blob = await storageCircuitBreaker.execute(() =>
        withRetry(() => this.storage.downloadBlob(sealId), 3, 1000),
      );
    } catch (error) {
      ErrorTracker.trackError(error as Error, {
        action: 'get_seal',
        sealId,
        ip,
      });
      logger.error("blob_fetch_failed", error as Error, { sealId });
      throw new Error(
        `Failed to fetch seal content: ${(error as Error).message}`,
      );
    }

    // ATOMIC: Record view and check exhaustion AFTER successful blob fetch
    const viewCheck = await recordViewAndCheck(
      this.db,
      sealId,
      fingerprint || "unknown",
      seal.isEphemeral || false,
      seal.viewCount || 0,
      seal.maxViews || null,
    );

    // FIX #9: Return blob even if exhausted (user already fetched it)
    if (!viewCheck.allowed) {
      return {
        id: sealId,
        unlockTime: seal.unlockTime,
        isDMS: seal.isDMS,
        status: "exhausted",
        blobHash: seal.blobHash,
        accessCount: seal.accessCount,
        isEphemeral: true,
        viewCount: viewCheck.viewCount,
        maxViews: viewCheck.maxViews,
        remainingViews: 0,
        blob,
      };
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

    // FIX #2: Delete if exhausted with correct rollback view count
    if (viewCheck.shouldDelete) {
      let dbDeleted = false;
      try {
        await this.db.deleteSeal(sealId);
        dbDeleted = true;
      } catch (dbError) {
        ErrorTracker.trackError(dbError as Error, {
          action: 'delete_seal_db',
          sealId,
        });
        logger.error("db_delete_failed", dbError as Error, { sealId });
        throw new Error("Failed to delete seal from database");
      }

      try {
        await this.storage.deleteBlob(sealId);
      } catch (error) {
        ErrorTracker.trackError(error as Error, {
          action: 'delete_seal_blob',
          sealId,
        });
        logger.error("blob_delete_failed", error as Error, { sealId });
        if (dbDeleted) {
          try {
            // CORRECTED: Use incremented viewCheck.viewCount (view already recorded in DB)
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

    // Best-effort access count increment (non-critical metric)
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

    // FIX #6: Atomic update with observability wrapped in try-catch
    try {
      await this.db.updatePulseAndUnlockTime(seal.id, now, newUnlockTime);
      
      // Best-effort observability - don't fail pulse on logging errors
      try {
        metrics.incrementPulseReceived();
        this.auditLogger?.log({
          timestamp: Date.now(),
          eventType: AuditEventType.PULSE_UPDATED,
          sealId: seal.id,
          ip,
          metadata: { newUnlockTime },
        });
        logger.info("pulse_received", { sealId: seal.id, newUnlockTime });
        sealEvents.emit("pulse:received", { sealId: seal.id, ip });
      } catch (obsError) {
        logger.error("pulse_observability_failed", obsError as Error, { sealId: seal.id });
      }

      return { newUnlockTime, newPulseToken };
    } catch (error) {
      ErrorTracker.trackError(error as Error, {
        action: 'pulse_seal',
        sealId: seal.id,
        ip,
      });
      logger.error("pulse_update_failed", error as Error, { sealId: seal.id });
      throw error;
    }
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
      ErrorTracker.trackError(error as Error, {
        action: 'unlock_seal',
        sealId,
        ip,
      });
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
      ErrorTracker.trackError(dbError as Error, {
        action: 'burn_seal_db',
        sealId,
        ip,
      });
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
