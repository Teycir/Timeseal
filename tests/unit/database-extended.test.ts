import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockDatabase, SealRecord } from '../../lib/database';

describe('Database - Extended Tests', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  describe('Pulse Operations', () => {
    it('should update pulse timestamp', async () => {
      const seal: SealRecord = {
        id: 'pulse-test',
        keyB: 'key',
        iv: 'iv',
        unlockTime: Date.now() + 10000,
        createdAt: Date.now(),
        isDMS: true,
        lastPulse: Date.now() - 1000,
        pulseInterval: 86400,
      };

      await db.createSeal(seal);
      const newTimestamp = Date.now();
      await db.updatePulse('pulse-test', newTimestamp);

      const retrieved = await db.getSeal('pulse-test');
      expect(retrieved?.lastPulse).toBe(newTimestamp);
    });

    it('should update unlock time', async () => {
      const seal: SealRecord = {
        id: 'unlock-test',
        keyB: 'key',
        iv: 'iv',
        unlockTime: Date.now() + 10000,
        createdAt: Date.now(),
        isDMS: false,
      };

      await db.createSeal(seal);
      const newUnlockTime = Date.now() + 20000;
      await db.updateUnlockTime('unlock-test', newUnlockTime);

      const retrieved = await db.getSeal('unlock-test');
      expect(retrieved?.unlockTime).toBe(newUnlockTime);
    });

    it('should find seal by pulse token', async () => {
      const seal: SealRecord = {
        id: 'token-test',
        keyB: 'key',
        iv: 'iv',
        unlockTime: Date.now() + 10000,
        createdAt: Date.now(),
        isDMS: true,
        pulseToken: 'test-token-123',
        pulseInterval: 86400,
        lastPulse: Date.now(),
      };

      await db.createSeal(seal);
      const retrieved = await db.getSealByPulseToken('test-token-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('token-test');
    });

    it('should return null for non-existent pulse token', async () => {
      const retrieved = await db.getSealByPulseToken('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should return null for non-existent seal', async () => {
      const retrieved = await db.getSeal('does-not-exist');
      expect(retrieved).toBeNull();
    });

    it('should handle empty expired DMS list', async () => {
      const expired = await db.getExpiredDMS();
      expect(expired).toEqual([]);
    });
  });

  describe('Multiple Seals', () => {
    it('should handle multiple seals independently', async () => {
      const seal1: SealRecord = {
        id: 'seal-1',
        keyB: 'key1',
        iv: 'iv1',
        unlockTime: Date.now() + 5000,
        createdAt: Date.now(),
        isDMS: false,
      };

      const seal2: SealRecord = {
        id: 'seal-2',
        keyB: 'key2',
        iv: 'iv2',
        unlockTime: Date.now() + 10000,
        createdAt: Date.now(),
        isDMS: true,
        pulseInterval: 86400,
        lastPulse: Date.now(),
      };

      await db.createSeal(seal1);
      await db.createSeal(seal2);

      const retrieved1 = await db.getSeal('seal-1');
      const retrieved2 = await db.getSeal('seal-2');

      expect(retrieved1?.keyB).toBe('key1');
      expect(retrieved2?.keyB).toBe('key2');
      expect(retrieved1?.isDMS).toBe(false);
      expect(retrieved2?.isDMS).toBe(true);
    });
  });
});
