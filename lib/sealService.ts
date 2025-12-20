// Seal Service - Business Logic Layer
import { StorageProvider } from './storage';
import { DatabaseProvider } from './database';
import { encryptKeyB, decryptKeyBWithFallback, getMasterKey } from './keyEncryption';
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
  hmac: string;
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
  hmac?: string;
}

export class SealService {
  constructor(
    private storage: StorageProvider,
    private db: DatabaseProvider
  ) {}

  async createSeal(request: CreateSealRequest, ip: string): Promise<{ sealId: string; iv: string; hmac: string; pulseToken?: string }> {
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
    const pulseToken = request.isDMS ? await generatePulseToken(sealId, getMasterKey()) : undefined;

    const encryptedKeyB = await encryptKeyB(request.keyB, getMasterKey(), sealId);

    await r2CircuitBreaker.execute(() =>
      withRetry(() => this.storage.uploadBlob(sealId, request.encryptedBlob, request.unlockTime), 3, 1000)
    );

    await this.db.createSeal({
      id: sealId,
      unlockTime: request.unlockTime,
      isDMS: request.isDMS || false,
      pulseInterval: request.pulseInterval,
      lastPulse: request.isDMS ? Date.now() : undefined,
      keyB: encryptedKeyB,
      iv: request.iv,
      hmac: request.hmac,
      pulseToken,
      createdAt: Date.now(),
    });

    auditSealCreated(sealId, ip, request.isDMS || false);
    metrics.incrementSealCreated();
    logger.info('seal_created', { sealId, isDMS: request.isDMS });

    return { sealId, iv: request.iv, hmac: request.hmac, pulseToken };
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
      decryptedKeyB = await decryptKeyBWithFallback(seal.keyB, sealId);
      metrics.incrementSealUnlocked();
    }

    auditSealAccessed(sealId, ip, isUnlocked ? 'unlocked' : 'locked');

    return {
      id: sealId,
      unlockTime: seal.unlockTime,
      isDMS: seal.isDMS,
      status: isUnlocked ? 'unlocked' : 'locked',
      keyB: decryptedKeyB,
      iv: isUnlocked ? seal.iv : undefined,
      hmac: isUnlocked ? seal.hmac : undefined,
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

    const isValid = await validatePulseToken(pulseToken, sealId, getMasterKey());
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
    logger.info('pulse_received', { sealId: seal.id, newUnlockTime });

    return { newUnlockTime };
  }

  private generateSealId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
}
