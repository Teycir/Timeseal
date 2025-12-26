import { describe, it, expect, beforeEach } from '@jest/globals';
import { SealService } from '../../lib/sealService';
import { AuditLogger, AuditEventType } from '../../lib/auditLogger';
import { MockStorage } from '../../lib/storage';
import { MockDatabase } from '../../lib/database';

describe('Audit Logging Integration', () => {
  let sealService: SealService;
  let auditLogger: AuditLogger;
  let mockDb: MockDatabase;
  let auditEvents: any[];

  beforeEach(() => {
    auditEvents = [];

    const mockAuditDb = {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          run: async () => {
            if (sql.includes('INSERT INTO audit_logs')) {
              auditEvents.push({
                timestamp: args[0],
                eventType: args[1],
                sealId: args[2],
                ip: args[3],
                metadata: JSON.parse(args[4] || '{}'),
              });
            }
            return { success: true };
          },
          all: async () => ({
            results: auditEvents.filter(e => e.sealId === args[0]),
          }),
        }),
      }),
    };

    mockDb = new MockDatabase();
    auditLogger = new AuditLogger(mockAuditDb);
    const storage = new MockStorage();
    sealService = new SealService(storage, mockDb, ['test-master-key-32-bytes-long!!'], auditLogger);
  });

  it('should log SEAL_CREATED event', async () => {
    const result = await sealService.createSeal({
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'testkey',
      iv: 'testiv',
      unlockTime: Date.now() + 120000, // 2 minutes
    }, '127.0.0.1');

    const createdEvents = auditEvents.filter(
      e => e.eventType === AuditEventType.SEAL_CREATED
    );

    expect(createdEvents.length).toBe(1);
    expect(createdEvents[0].sealId).toBe(result.sealId);
    expect(createdEvents[0].ip).toBe('127.0.0.1');
  });

  it('should log SEAL_ACCESS_DENIED for locked seal', async () => {
    const result = await sealService.createSeal({
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'testkey',
      iv: 'testiv',
      unlockTime: Date.now() + 120000, // 2 minutes
    }, '127.0.0.1');

    await sealService.getSeal(result.sealId, '192.168.1.1');

    const deniedEvents = auditEvents.filter(
      e => e.eventType === AuditEventType.SEAL_ACCESS_DENIED
    );

    expect(deniedEvents.length).toBe(1);
    expect(deniedEvents[0].ip).toBe('192.168.1.1');
  });

  it('should log SEAL_UNLOCKED for unlocked seal', async () => {
    const result = await sealService.createSeal({
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'testkey',
      iv: 'testiv',
      unlockTime: Date.now() + 61000,
    }, '127.0.0.1');

    // Manually set unlock time to past
    const seal = await mockDb.getSeal(result.sealId);
    if (seal) {
      seal.unlockTime = Date.now() - 1000;
    }

    await sealService.getSeal(result.sealId, '10.0.0.1');

    const unlockedEvents = auditEvents.filter(
      e => e.eventType === AuditEventType.SEAL_UNLOCKED
    );

    expect(unlockedEvents.length).toBe(1);
    expect(unlockedEvents[0].ip).toBe('10.0.0.1');
  });

  it('should log PULSE_UPDATED for DMS', async () => {
    const result = await sealService.createSeal({
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'testkey',
      iv: 'testiv',
      unlockTime: Date.now() + 120000, // 2 minutes
      isDMS: true,
      pulseInterval: 3600 * 1000,
    }, '127.0.0.1');

    if (result.pulseToken) {
      await sealService.pulseSeal(result.pulseToken, '172.16.0.1');

      const pulseEvents = auditEvents.filter(
        e => e.eventType === AuditEventType.PULSE_UPDATED
      );

      expect(pulseEvents.length).toBe(1);
      expect(pulseEvents[0].ip).toBe('172.16.0.1');
    }
  });

  it('should track multiple IPs accessing same seal', async () => {
    const result = await sealService.createSeal({
      encryptedBlob: new ArrayBuffer(100),
      keyB: 'testkey',
      iv: 'testiv',
      unlockTime: Date.now() + 120000, // 2 minutes
    }, '127.0.0.1');

    const ips = ['1.1.1.1', '2.2.2.2', '3.3.3.3'];
    for (const ip of ips) {
      await sealService.getSeal(result.sealId, ip);
    }

    const uniqueIps = new Set(auditEvents.map(e => e.ip));
    expect(uniqueIps.size).toBeGreaterThanOrEqual(ips.length);
  });
});
