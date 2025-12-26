// Timed Release Unlock Logic Tests
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SealService } from '@/lib/sealService';
import { MockDatabase } from '@/lib/database';
import { MockStorage } from '@/lib/storage';

describe('Timed Release Unlock Logic', () => {
  let sealService: SealService;
  let db: MockDatabase;
  let storage: MockStorage;

  beforeEach(() => {
    db = new MockDatabase();
    storage = new MockStorage();
    sealService = new SealService(storage, db, ['test-master-key-32-bytes-long!!']);
  });

  it('should create timed release seal without pulse interval', async () => {
    const unlockTime = Date.now() + 3600000; // 1 hour
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime,
      isDMS: false,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');
    expect(result.sealId).toBeTruthy();
    expect(result.pulseToken).toBeUndefined();
  });

  it('should keep seal locked before unlock time', async () => {
    const unlockTime = Date.now() + 3600000; // 1 hour
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime,
      isDMS: false,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');
    const seal = await sealService.getSeal(result.sealId, '127.0.0.1');

    expect(seal.status).toBe('locked');
    expect(seal.keyB).toBeUndefined();
    expect(seal.unlockTime).toBe(unlockTime);
  });

  it('should unlock seal at exact unlock time', async () => {
    const unlockTime = Date.now() + 120000; // 2 minutes (valid)
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime,
      isDMS: false,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');

    // Manually set unlock time to past
    const seal = await db.getSeal(result.sealId);
    if (seal) {
      seal.unlockTime = Date.now() - 1000;
      await db.createSeal(seal);
    }

    const unlockedSeal = await sealService.getSeal(result.sealId, '127.0.0.1');
    expect(unlockedSeal.status).toBe('unlocked');
    expect(unlockedSeal.keyB).toBeTruthy();
  });

  it('should validate unlock time is in future', async () => {
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() - 1000, // Past
      isDMS: false,
    };

    await expect(
      sealService.createSeal(request, '127.0.0.1')
    ).rejects.toThrow('Unlock time must be at least 1 minute in the future');
  });

  it('should validate unlock time is at least 1 minute away', async () => {
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + 30000, // 30 seconds
      isDMS: false,
    };

    await expect(
      sealService.createSeal(request, '127.0.0.1')
    ).rejects.toThrow('Unlock time must be at least 1 minute in the future');
  });

  it('should validate unlock time is within 30 days', async () => {
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + (31 * 24 * 60 * 60 * 1000), // 31 days
      isDMS: false,
    };

    await expect(
      sealService.createSeal(request, '127.0.0.1')
    ).rejects.toThrow('Unlock time cannot exceed 30 days');
  });

  it('should not have pulse token for timed release', async () => {
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + 3600000,
      isDMS: false,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');
    const seal = await db.getSeal(result.sealId);

    expect(seal?.pulseToken).toBeUndefined();
    expect(seal?.pulseInterval).toBeUndefined();
    expect(seal?.lastPulse).toBeUndefined();
  });

  it('should correctly check unlock with >= comparison', async () => {
    const unlockTime = Date.now() + 120000; // 2 minutes
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime,
      isDMS: false,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');

    // Set unlock time to exactly now
    const seal = await db.getSeal(result.sealId);
    if (seal) {
      seal.unlockTime = Date.now();
      await db.createSeal(seal);
    }

    const unlockedSeal = await sealService.getSeal(result.sealId, '127.0.0.1');
    expect(unlockedSeal.status).toBe('unlocked');
  });
});
