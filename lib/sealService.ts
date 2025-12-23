// Seal Service - Business Logic Layer
import { StorageProvider } from './storage';
import { DatabaseProvider } from './database';
import { encryptKeyB, decryptKeyBWithFallback } from './keyEncryption';
import { validateFileSize, validateUnlockTime, validatePulseInterval } from './validation';
import { logger, auditSealCreated, auditSealAccessed } from './logger';
import { metrics } from './metrics';
import { ErrorCode } from './errors';
import { storageCircuitBreaker, withRetry } from './circuitBreaker';
import { generatePulseToken, validatePulseToken, checkAndStoreNonce } from './security';
import { sealEvents } from './patterns/observer';

export interface CreateSealRequest {
  encryptedBlob: ArrayBuffer;
  keyB: string;
  iv: string;
  unlockTime: number;
  isDMS?: boolean;
  pulseInterval?: number;
  unlockMessage?: string;
  expiresAfterDays?: number;
}

export interface SealMetadata {
  id: string;
  unlockTime: number;
  isDMS: boolean;
  status: 'locked' | 'unlocked';
  keyB?: string;
  iv?: string;
  blobHash?: string;
  unlockMessage?: string;
  accessCount?: number;
}

export interface SealReceipt {
  sealId: string;
  blobHash: string;
  unlockTime: number;
  createdAt: number;
  signature: string;
}

import { AuditLogger, AuditEventType } from './auditLogger';

export class SealService {
  constructor(
    private storage: StorageProvider,
    private db: DatabaseProvider,
    private masterKey: string,
    private auditLogger?: AuditLogger
  ) {
    if (!masterKey) {
      throw new Error('SealService requires masterKey');
    }
  }

  async createSeal(request: CreateSealRequest, ip: string): Promise<{ sealId: string; iv: string; pulseToken?: string; receipt: SealReceipt }> {
    const sizeValidation = validateFileSize(request.encryptedBlob.byteLength);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    const timeValidation = validateUnlockTime(request.unlockTime);
    if (!timeValidation.valid) {
      throw new Error(timeValidation.error);
    }

    if (request.isDMS) {
      if (!request.pulseInterval) {
        throw new Error('Dead Man\'s Switch requires pulse interval');
      }
      const pulseValidation = validatePulseInterval(request.pulseInterval);
      if (!pulseValidation.valid) {
        throw new Error(pulseValidation.error);
      }
    }

    const sealId = this.generateSealId();
    const createdAt = Date.now();
    const pulseToken = request.isDMS ? await generatePulseToken(sealId, this.masterKey) : undefined;

    const encryptedKeyB = await encryptKeyB(request.keyB, this.masterKey, sealId);

    // Generate cryptographic receipt
    const blobHash = await this.hashBlob(request.encryptedBlob);
    
    // Calculate expiration
    const expiresAt = request.expiresAfterDays 
      ? request.unlockTime + (request.expiresAfterDays * 24 * 60 * 60 * 1000)
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
      });

      // Then upload blob (D1BlobStorage needs the row to exist)
      await storageCircuitBreaker.execute(() =>
        withRetry(() => this.storage.uploadBlob(sealId, request.encryptedBlob, request.unlockTime), 3, 1000)
      );
    } catch (error) {
      // Rollback: delete database record if blob upload fails
      try {
        await this.db.deleteSeal(sealId);
      } catch (rollbackError) {
        logger.error('rollback_failed', rollbackError as Error, { sealId });
      }
      throw error;
    }

    // Generate receipt after successful creation
    const receipt = await this.generateReceipt(sealId, blobHash, request.unlockTime, createdAt);

    auditSealCreated(sealId, ip, request.isDMS || false);
    this.auditLogger?.log({
      timestamp: createdAt,
      eventType: AuditEventType.SEAL_CREATED,
      sealId,
      ip,
      metadata: { isDMS: request.isDMS, unlockTime: request.unlockTime, blobHash },
    });
    metrics.incrementSealCreated();
    logger.info('seal_created', { sealId, isDMS: request.isDMS });

    // Emit event for observers
    sealEvents.emit('seal:created', { sealId, isDMS: request.isDMS || false, ip });

    return { sealId, iv: request.iv, pulseToken, receipt };
  }

  async getSeal(sealId: string, ip: string): Promise<SealMetadata> {
    const seal = await this.db.getSeal(sealId);

    if (!seal) {
      throw new Error(ErrorCode.SEAL_NOT_FOUND);
    }

    // Check time BEFORE any other operations to prevent timing attacks
    const now = Date.now();
    const isUnlocked = now >= seal.unlockTime;

    // Add jitter for locked seals (already done in API route, but double-check here)
    if (!isUnlocked) {
      auditSealAccessed(sealId, ip, 'locked');
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
        status: 'locked',
        blobHash: seal.blobHash,
        accessCount: seal.accessCount,
      };
    }

    // Only increment access count on unlock
    await this.db.incrementAccessCount(sealId);

    // Only decrypt if unlocked
    const decryptedKeyB = await decryptKeyBWithFallback(seal.keyB, sealId, [this.masterKey]);
    metrics.incrementSealUnlocked();

    auditSealAccessed(sealId, ip, 'unlocked');
    this.auditLogger?.log({
      timestamp: now,
      eventType: AuditEventType.SEAL_UNLOCKED,
      sealId,
      ip,
      metadata: { unlockTime: seal.unlockTime },
    });

    // Emit event for observers
    sealEvents.emit('seal:unlocked', { sealId, ip });

    return {
      id: sealId,
      unlockTime: seal.unlockTime,
      isDMS: seal.isDMS,
      status: 'unlocked',
      keyB: decryptedKeyB,
      iv: seal.iv,
      blobHash: seal.blobHash,
      unlockMessage: seal.unlockMessage,
      accessCount: seal.accessCount,
    };
  }

  async getBlob(sealId: string): Promise<ArrayBuffer> {
    return await storageCircuitBreaker.execute(() =>
      withRetry(() => this.storage.downloadBlob(sealId), 3, 1000)
    );
  }

  async pulseSeal(pulseToken: string, ip: string, newInterval?: number): Promise<{ newUnlockTime: number; newPulseToken: string }> {
    const parts = pulseToken.split(':');
    if (parts.length !== 4) {
      throw new Error(ErrorCode.INVALID_INPUT);
    }

    const [sealId, timestamp, nonce, signature] = parts;

    // Validate format strictly
    if (!/^[a-f0-9]{32}$/.test(sealId)) {
      throw new Error('Invalid seal ID format');
    }
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || ts < 0 || ts.toString() !== timestamp) {
      throw new Error('Invalid timestamp format');
    }
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(nonce)) {
      throw new Error('Invalid nonce format');
    }

    // Check nonce FIRST (atomic, prevents race condition)
    const nonceValid = await checkAndStoreNonce(nonce, this.db);
    if (!nonceValid) {
      throw new Error('Replay attack detected');
    }

    // Then validate token signature
    const isValid = await validatePulseToken(pulseToken, sealId, this.masterKey);
    if (!isValid) {
      throw new Error(ErrorCode.INVALID_INPUT);
    }

    const seal = await this.db.getSeal(sealId);
    if (!seal || !seal.isDMS) {
      throw new Error(ErrorCode.SEAL_NOT_FOUND);
    }

    const now = Date.now();
    const intervalToUse = newInterval
      ? newInterval * 24 * 60 * 60 * 1000
      : (seal.pulseInterval || 0);

    if (intervalToUse === 0) {
      throw new Error('Pulse interval not configured');
    }

    const newUnlockTime = now + intervalToUse;
    const newPulseToken = await generatePulseToken(sealId, this.masterKey);

    // Atomic update (both or neither)
    try {
      await this.db.updatePulseAndUnlockTime(seal.id, now, newUnlockTime);
    } catch (error) {
      logger.error('pulse_update_failed', error as Error, { sealId: seal.id });
      throw new Error('Failed to update pulse');
    }

    metrics.incrementPulseReceived();
    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: AuditEventType.PULSE_UPDATED,
      sealId: seal.id,
      ip,
      metadata: { newUnlockTime },
    });
    logger.info('pulse_received', { sealId: seal.id, newUnlockTime });

    // Emit event for observers
    sealEvents.emit('pulse:received', { sealId: seal.id, ip });

    return { newUnlockTime, newPulseToken };
  }

  async burnSeal(pulseToken: string, ip: string): Promise<void> {
    const parts = pulseToken.split(':');
    if (parts.length !== 4) {
      throw new Error(ErrorCode.INVALID_INPUT);
    }

    const [sealId, timestamp, nonce] = parts;

    // Validate token FIRST
    const isValid = await validatePulseToken(pulseToken, sealId, this.masterKey);
    if (!isValid) {
      throw new Error(ErrorCode.INVALID_INPUT);
    }

    const nonceValid = await checkAndStoreNonce(nonce, this.db);
    if (!nonceValid) {
      throw new Error('Replay attack detected');
    }

    const seal = await this.db.getSeal(sealId);
    if (!seal || !seal.isDMS) {
      throw new Error(ErrorCode.SEAL_NOT_FOUND);
    }

    // Delete DB first (reversible), then blob (idempotent)
    try {
      await this.db.deleteSeal(sealId);
    } catch (dbError) {
      logger.error('db_delete_failed', dbError as Error, { sealId });
      throw dbError; // Critical - don't proceed
    }

    try {
      await this.storage.deleteBlob(sealId);
    } catch (storageError) {
      // Non-critical - blob orphaned but seal is gone
      logger.error('blob_delete_failed', storageError as Error, { sealId });
    }

    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: AuditEventType.SEAL_DELETED,
      sealId,
      ip,
      metadata: { burned: true },
    });
    logger.info('seal_burned', { sealId });

    // Emit event for observers
    sealEvents.emit('seal:deleted', { sealId });
  }

  private generateSealId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hashBlob(blob: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', blob);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async generateReceipt(sealId: string, blobHash: string, unlockTime: number, createdAt: number): Promise<SealReceipt> {
    const data = `${sealId}:${blobHash}:${unlockTime}:${createdAt}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.masterKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const sigArray = Array.from(new Uint8Array(signature));
    const sigHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return { sealId, blobHash, unlockTime, createdAt, signature: sigHex };
  }
}
