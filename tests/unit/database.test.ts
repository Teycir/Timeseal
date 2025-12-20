import { describe, it, expect, beforeEach } from '@jest/globals';
import { createDatabase, DatabaseProvider, SealRecord } from '../../lib/database';

describe('Time-Seal Database Logic', () => {
    let db: DatabaseProvider;

    beforeEach(() => {
        db = createDatabase();
    });

    it('should store a seal and retrieve it', async () => {
        const seal: SealRecord = {
            id: 'test-id-1',
            keyB: 'dummy-key-b',
            iv: 'dummy-iv',
            unlockTime: Date.now() + 10000,
            createdAt: Date.now(),
            isDMS: false
        };

        await db.createSeal(seal);
        const retrieved = await db.getSeal('test-id-1');

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(seal.id);
        expect(retrieved?.keyB).toBe(seal.keyB);
    });

    it('should NOT unlock early (Logic verification)', async () => {
        const unlockTime = Date.now() + 10000;
        const seal: SealRecord = {
            id: 'locked-seal',
            keyB: 'secret-key-b',
            iv: 'dummy-iv',
            unlockTime: unlockTime,
            createdAt: Date.now(),
            isDMS: false
        };

        await db.createSeal(seal);
        const retrieved = await db.getSeal('locked-seal');

        const now = Date.now();
        const isLocked = now < (retrieved?.unlockTime || 0);

        expect(isLocked).toBe(true);
    });

    it('should be unlocked after time passes', async () => {
        const unlockTime = Date.now() - 1000;
        const seal: SealRecord = {
            id: 'future-seal',
            keyB: 'secret-key-b',
            iv: 'dummy-iv',
            unlockTime: unlockTime,
            createdAt: Date.now(),
            isDMS: false
        };

        await db.createSeal(seal);

        const retrieved = await db.getSeal('future-seal');
        const now = Date.now();
        const isLocked = now < (retrieved?.unlockTime || 0);

        expect(isLocked).toBe(false);
    });

    it('should find expired Dead Man Switches', async () => {
        const now = Date.now();
        const pulseInterval = 24 * 60 * 60 * 1000;

        const expiredSeal: SealRecord = {
            id: 'expired-dms',
            keyB: 'key',
            iv: 'dummy-iv',
            unlockTime: 0,
            createdAt: now - (3 * 24 * 60 * 60 * 1000),
            isDMS: true,
            lastPulse: now - (2 * 24 * 60 * 60 * 1000),
            pulseInterval: pulseInterval
        };

        await db.createSeal(expiredSeal);

        const validSeal: SealRecord = {
            id: 'valid-dms',
            keyB: 'key',
            iv: 'dummy-iv',
            unlockTime: 0,
            createdAt: now,
            isDMS: true,
            lastPulse: now - (60 * 60 * 1000),
            pulseInterval: pulseInterval
        };

        await db.createSeal(validSeal);

        const expiredList = await db.getExpiredDMS();

        expect(expiredList.some(s => s.id === 'expired-dms')).toBe(true);
        expect(expiredList.some(s => s.id === 'valid-dms')).toBe(false);
    });
});
