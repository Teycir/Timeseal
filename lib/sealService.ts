// Seal Service - Business Logic Layer
import { StorageProvider } from './storage';
import { DatabaseProvider } from './database';
import { encryptKeyB, decryptKeyBWithFallback } from './keyEncryption';
import { validateFileSize, validateUnlockTime, validatePulseInterval } from './validation';
import { logger, auditSealCreated, auditSealAccessed } from './logger';
import { metrics } from './metrics';
import { ErrorCode } from './errors';
import { r2CircuitBreaker, withRetry } from './circuitBreaker';
import { generatePulseToken, validatePulseToken, checkAndStoreNonce } from './security';

export interface CreateSealRequest {
  encryptedBlob: ArrayBuffer;
  keyB: string;
  iv: string;
  unlockTime: number;
  isDMS?: boolean;
  pulseInterval?: number;
}

export interface SealMetadata {
  id: string;
  unlockTime: number;
  isDMS: boolean;
  status: 'locked' | 'unlocked';
  keyB?: string;
  iv?: string;
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

  async createSeal(request: CreateSealRequest, ip: string): Promise<{ sealId: string; iv: string; pulseToken?: string }> {
    const sizeValidation = validateFileSize(request.encryptedBlob.byteLength);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error);
    }

    const timeValidation = validateUnlockTime(request.unlockTime);
    if (!timeValidation.valid) {
      throw new Error(timeValidation.error);
    }

    if (request.isDMS && request.pulseInterval) {
      const pulseValidation = validatePulseInterval(request.pulseInterval);
      if (!pulseValidation.valid) {
        throw new Error(pulseValidation.error);
      }
    }

    const sealId = this.generateSealId();
    const pulseToken = request.isDMS ? await generatePulseToken(sealId, this.masterKey) : undefined;

    const encryptedKeyB = await encryptKeyB(request.keyB, this.masterKey, sealId);

    // Create seal record first
    await this.db.createSeal({
      id: sealId,
      unlockTime: request.unlockTime,
      isDMS: request.isDMS || false,
      pulseInterval: request.pulseInterval,
      lastPulse: request.isDMS ? Date.now() : undefined,
      keyB: encryptedKeyB,
      iv: request.iv,
      pulseToken,
      createdAt: Date.now(),
    });

    // Then upload blob (D1BlobStorage needs the row to exist)
    await r2CircuitBreaker.execute(() =>
      withRetry(() => this.storage.uploadBlob(sealId, request.encryptedBlob, request.unlockTime), 3, 1000)
    );

    auditSealCreated(sealId, ip, request.isDMS || false);
    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: AuditEventType.SEAL_CREATED,
      sealId,
      ip,
      metadata: { isDMS: request.isDMS, unlockTime: request.unlockTime },
    });
    metrics.incrementSealCreated();
    logger.info('seal_created', { sealId, isDMS: request.isDMS });

    return { sealId, iv: request.iv, pulseToken };
  }

  async getSeal(sealId: string, ip: string): Promise<SealMetadata> {
    const seal = await this.db.getSeal(sealId);

    if (!seal) {
      throw new Error(ErrorCode.SEAL_NOT_FOUND);
    }

    const now = Date.now();
    const isUnlocked = now >= seal.unlockTime;

    let decryptedKeyB: string | undefined;
    if (isUnlocked) {
      decryptedKeyB = await decryptKeyBWithFallback(seal.keyB, sealId, [this.masterKey]);
      metrics.incrementSealUnlocked();
    }

    auditSealAccessed(sealId, ip, isUnlocked ? 'unlocked' : 'locked');
    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: isUnlocked ? AuditEventType.SEAL_UNLOCKED : AuditEventType.SEAL_ACCESS_DENIED,
      sealId,
      ip,
      metadata: { unlockTime: seal.unlockTime },
    });

    return {
      id: sealId,
      unlockTime: seal.unlockTime,
      isDMS: seal.isDMS,
      status: isUnlocked ? 'unlocked' : 'locked',
      keyB: decryptedKeyB,
      iv: isUnlocked ? seal.iv : undefined,
    };
  }

  async getBlob(sealId: string): Promise<ArrayBuffer> {
    return await r2CircuitBreaker.execute(() =>
      withRetry(() => this.storage.downloadBlob(sealId), 3, 1000)
    );
  }

  async pulseSeal(pulseToken: string, ip: string): Promise<{ newUnlockTime: number }> {
    const parts = pulseToken.split(':');
    if (parts.length !== 4) {
      throw new Error(ErrorCode.INVALID_INPUT);
    }

    const [sealId, timestamp, nonce] = parts;

    if (!checkAndStoreNonce(nonce)) {
      throw new Error('Replay attack detected');
    }

    const isValid = await validatePulseToken(pulseToken, sealId, this.masterKey);
    if (!isValid) {
      throw new Error(ErrorCode.INVALID_INPUT);
    }

    const seal = await this.db.getSeal(sealId);
    if (!seal || !seal.isDMS) {
      throw new Error(ErrorCode.SEAL_NOT_FOUND);
    }

    const now = Date.now();
    const newUnlockTime = now + (seal.pulseInterval || 0) * 1000;

    await this.db.updatePulse(seal.id, now);
    await this.db.updateUnlockTime(seal.id, newUnlockTime);

    metrics.incrementPulseReceived();
    this.auditLogger?.log({
      timestamp: Date.now(),
      eventType: AuditEventType.PULSE_UPDATED,
      sealId: seal.id,
      ip,
      metadata: { newUnlockTime },
    });
    logger.info('pulse_received', { sealId: seal.id, newUnlockTime });

    return { newUnlockTime };
  }

  private generateSealId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
}
