// Dead Man's Switch Unlock Logic Tests
import { describe, it, expect, beforeEach } from '@jest/globals';
import { SealService } from '@/lib/sealService';
import { MockDatabase } from '@/lib/database';
import { MockStorage } from '@/lib/storage';

describe('Dead Man\'s Switch Unlock Logic', () => {
  let sealService: SealService;
  let db: MockDatabase;
  let storage: MockStorage;

  beforeEach(() => {
    db = new MockDatabase();
    storage = new MockStorage();
    sealService = new SealService(storage, db, ['test-master-key-32-bytes-long!!']);
  });

  it('should reject DMS seal creation without pulse interval', async () => {
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + 3600000,
      isDMS: true,
      // pulseInterval missing!
    };

    await expect(
      sealService.createSeal(request, '127.0.0.1')
    ).rejects.toThrow('Dead Man\'s Switch requires pulse interval');
  });

  it('should accept DMS seal with valid pulse interval', async () => {
    const pulseInterval = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + pulseInterval,
      isDMS: true,
      pulseInterval,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');
    expect(result.sealId).toBeTruthy();
    expect(result.pulseToken).toBeTruthy();
  });

  it('should reject DMS with pulse interval too short', async () => {
    const pulseInterval = 4 * 60 * 1000; // 4 minutes (below 5 min minimum)
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + 3600000, // Valid unlock time
      isDMS: true,
      pulseInterval,
    };

    await expect(
      sealService.createSeal(request, '127.0.0.1')
    ).rejects.toThrow('Pulse interval must be at least 5 minutes');
  });

  it('should reject DMS with pulse interval too long', async () => {
    const pulseInterval = 31 * 24 * 60 * 60 * 1000; // 31 days (above 30 day max)
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + 3600000, // Valid unlock time
      isDMS: true,
      pulseInterval,
    };

    await expect(
      sealService.createSeal(request, '127.0.0.1')
    ).rejects.toThrow('Pulse interval cannot exceed 30 days');
  });

  it('should correctly calculate unlock time after pulse', async () => {
    const pulseInterval = 3600000; // 1 hour in ms
    const now = Date.now();

    // Create DMS seal
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: now + pulseInterval,
      isDMS: true,
      pulseInterval,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');

    // Pulse the seal
    const pulseResult = await sealService.pulseSeal(result.pulseToken!, '127.0.0.1');

    // New unlock time should be approximately now + interval
    const expectedUnlockTime = Date.now() + pulseInterval;
    expect(pulseResult.newUnlockTime).toBeGreaterThanOrEqual(expectedUnlockTime - 1000);
    expect(pulseResult.newUnlockTime).toBeLessThanOrEqual(expectedUnlockTime + 1000);
  });

  it('should reject pulse without configured interval', async () => {
    // This shouldn't happen due to validation, but test defensive code
    const pulseInterval = 3600000;
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + pulseInterval,
      isDMS: true,
      pulseInterval,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');

    // Manually corrupt the seal to have no interval
    const seal = await db.getSeal(result.sealId);
    if (seal) {
      seal.pulseInterval = undefined;
      await db.createSeal(seal); // Overwrite
    }

    await expect(
      sealService.pulseSeal(result.pulseToken!, '127.0.0.1')
    ).rejects.toThrow('Pulse interval not configured');
  });

  it('should handle getExpiredDMS with NULL values', async () => {    // Create a normal DMS seal
    const pulseInterval = 5 * 60 * 1000; // 5 minutes (minimum valid)
    const request = {
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'test-key-b-base64-encoded-string-here',
      iv: 'test-iv-16chars',
      unlockTime: Date.now() + 120000, // 2 minutes (valid)
      isDMS: true,
      pulseInterval,
    };

    const result = await sealService.createSeal(request, '127.0.0.1');

    // Manually set lastPulse to past to simulate expiration
    const seal = await db.getSeal(result.sealId);
    if (seal) {
      seal.lastPulse = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      await db.createSeal(seal); // Overwrite
    }

    // Should find expired seal
    const expired = await db.getExpiredDMS();
    expect(expired.length).toBeGreaterThan(0);
    expect(expired.find(s => s.id === result.sealId)).toBeTruthy();
  });

  it('should not return DMS with NULL lastPulse in getExpiredDMS', async () => {
    // Create seal with missing lastPulse (shouldn't happen, but defensive)
    await db.createSeal({
      id: 'test-seal-null-pulse',
      unlockTime: Date.now() + 1000,
      isDMS: true,
      pulseInterval: 1000,
      lastPulse: undefined, // NULL
      keyB: 'encrypted-key',
      iv: 'test-iv',
      createdAt: Date.now(),
      accessCount: 0,
    });

    const expired = await db.getExpiredDMS();
    expect(expired.find(s => s.id === 'test-seal-null-pulse')).toBeUndefined();
  });
});
