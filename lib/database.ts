// Database Abstraction Layer
import type { D1Database } from '@cloudflare/workers-types';

export interface DatabaseProvider {
  createSeal(data: SealRecord): Promise<void>;
  getSeal(id: string): Promise<SealRecord | null>;
  getSealByPulseToken(token: string): Promise<SealRecord | null>;
  updatePulse(id: string, timestamp: number): Promise<void>;
  updateUnlockTime(id: string, unlockTime: number): Promise<void>;
  updatePulseAndUnlockTime(id: string, lastPulse: number, unlockTime: number): Promise<void>;
  incrementAccessCount(id: string): Promise<void>;
  deleteSeal(id: string): Promise<void>;
  getExpiredDMS(): Promise<SealRecord[]>;
  checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }>;
  storeNonce(nonce: string, expiresAt: number): Promise<boolean>;
}

export interface SealRecord {
  id: string;
  unlockTime: number;
  isDMS: boolean;
  pulseInterval?: number;
  lastPulse?: number;
  keyB: string;
  iv: string;
  pulseToken?: string;
  createdAt: number;
  blobHash?: string;
  unlockMessage?: string;
  expiresAt?: number;
  accessCount?: number;
}

// Production D1 Database
export class SealDatabase implements DatabaseProvider {
  constructor(public db: D1Database) { }

  private mapResultToSealRecord(result: any): SealRecord {
    return {
      id: String(result.id || ''),
      unlockTime: Number(result.unlock_time || 0),
      isDMS: result.is_dms === 1,
      pulseInterval: result.pulse_interval ? Number(result.pulse_interval) : undefined,
      lastPulse: result.last_pulse ? Number(result.last_pulse) : undefined,
      keyB: String(result.key_b || ''),
      iv: String(result.iv || ''),
      pulseToken: result.pulse_token ? String(result.pulse_token) : undefined,
      createdAt: Number(result.created_at || 0),
      blobHash: result.blob_hash ? String(result.blob_hash) : undefined,
      unlockMessage: result.unlock_message ? String(result.unlock_message) : undefined,
      expiresAt: result.expires_at ? Number(result.expires_at) : undefined,
      accessCount: result.access_count ? Number(result.access_count) : 0,
    };
  }

  async createSeal(data: SealRecord): Promise<void> {
    const result = await this.db.prepare(
      `INSERT INTO seals (id, unlock_time, is_dms, pulse_interval, last_pulse, key_b, iv, pulse_token, created_at, blob_hash, unlock_message, expires_at, access_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.unlockTime,
      data.isDMS ? 1 : 0,
      data.pulseInterval || null,
      data.lastPulse || null,
      data.keyB,
      data.iv,
      data.pulseToken || null,
      data.createdAt,
      data.blobHash || null,
      data.unlockMessage || null,
      data.expiresAt || null,
      data.accessCount || 0
    ).run();

    if (!result.success) {
      throw new Error('Failed to create seal in database');
    }
  }

  async getSeal(id: string): Promise<SealRecord | null> {
    const result = await this.db.prepare(
      'SELECT * FROM seals WHERE id = ?'
    ).bind(id).first();

    if (!result) return null;
    return this.mapResultToSealRecord(result);
  }

  async incrementAccessCount(id: string): Promise<void> {
    await this.db.prepare(
      'UPDATE seals SET access_count = access_count + 1 WHERE id = ?'
    ).bind(id).run();
  }

  async updatePulse(id: string, timestamp: number): Promise<void> {
    const result = await this.db.prepare(
      'UPDATE seals SET last_pulse = ? WHERE id = ?'
    ).bind(timestamp, id).run();

    if (!result.success) {
      throw new Error('Failed to update pulse');
    }
  }

  async updateUnlockTime(id: string, unlockTime: number): Promise<void> {
    const result = await this.db.prepare(
      'UPDATE seals SET unlock_time = ? WHERE id = ?'
    ).bind(unlockTime, id).run();

    if (!result.success) {
      throw new Error('Failed to update unlock time');
    }
  }

  async updatePulseAndUnlockTime(id: string, lastPulse: number, unlockTime: number): Promise<void> {
    const result = await this.db.prepare(
      'UPDATE seals SET last_pulse = ?, unlock_time = ? WHERE id = ?'
    ).bind(lastPulse, unlockTime, id).run();

    if (!result.success) {
      throw new Error('Failed to update pulse and unlock time');
    }
  }

  async deleteSeal(id: string): Promise<void> {
    const result = await this.db.prepare(
      'DELETE FROM seals WHERE id = ?'
    ).bind(id).run();

    if (!result.success) {
      throw new Error('Failed to delete seal');
    }
  }

  async getSealByPulseToken(token: string): Promise<SealRecord | null> {
    const result = await this.db.prepare(
      'SELECT * FROM seals WHERE pulse_token = ?'
    ).bind(token).first();

    if (!result) return null;
    return this.mapResultToSealRecord(result);
  }

  async getExpiredDMS(): Promise<SealRecord[]> {
    const results = await this.db.prepare(
      `SELECT * FROM seals
       WHERE is_dms = 1
       AND last_pulse IS NOT NULL
       AND pulse_interval IS NOT NULL
       AND last_pulse + pulse_interval < ?`
    ).bind(Date.now()).all();

    return results.results.map((r: any) => this.mapResultToSealRecord(r));
  }

  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const resetAt = now + window;

    const existing = await this.db.prepare(
      'SELECT count, reset_at FROM rate_limits WHERE key = ?'
    ).bind(key).first() as { count: number; reset_at: number } | null;

    if (!existing || now > existing.reset_at) {
      await this.db.prepare(
        'INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)'
      ).bind(key, resetAt).run();
      return { allowed: true, remaining: limit - 1 };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await this.db.prepare(
      'UPDATE rate_limits SET count = count + 1 WHERE key = ?'
    ).bind(key).run();
    return { allowed: true, remaining: limit - existing.count - 1 };
  }

  async storeNonce(nonce: string, expiresAt: number): Promise<boolean> {
    try {
      const result = await this.db.prepare(
        'INSERT INTO nonces (nonce, expires_at) VALUES (?, ?)'
      ).bind(nonce, expiresAt).run();
      return result.success;
    } catch (error) {
      // Distinguish between replay attacks and database errors
      const err = error as Error;
      if (err.message?.includes('UNIQUE')) {
        console.warn('[SECURITY] Replay attack detected:', nonce);
      } else {
        console.error('[DB] Nonce storage failed:', err);
      }
      return false;
    }
  }
}

// Singleton pattern for global mock store
class MockStore {
  private static instance: MockStore;
  private seals = new Map<string, SealRecord>();
  private blobs = new Map<string, ArrayBuffer>();

  private constructor() { }

  static getInstance(): MockStore {
    if (!MockStore.instance) {
      MockStore.instance = new MockStore();
    }
    return MockStore.instance;
  }

  getSeals() { return this.seals; }
  getBlobs() { return this.blobs; }

  clear() {
    this.seals.clear();
    this.blobs.clear();
  }
}

// Mock Database for Development
export class MockDatabase implements DatabaseProvider {
  private store = MockStore.getInstance();

  async createSeal(data: SealRecord): Promise<void> {
    this.store.getSeals().set(data.id, data);
  }

  async getSeal(id: string): Promise<SealRecord | null> {
    return this.store.getSeals().get(id) || null;
  }

  async incrementAccessCount(id: string): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (seal) {
      seal.accessCount = (seal.accessCount || 0) + 1;
      this.store.getSeals().set(id, seal);
    }
  }

  async updatePulse(id: string, timestamp: number): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (!seal) {
      throw new Error(`Failed to update pulse for seal ${id}`);
    }
    seal.lastPulse = timestamp;
    this.store.getSeals().set(id, seal);
  }

  async updateUnlockTime(id: string, unlockTime: number): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (!seal) {
      throw new Error(`Failed to update unlock time for seal ${id}`);
    }
    seal.unlockTime = unlockTime;
    this.store.getSeals().set(id, seal);
  }

  async updatePulseAndUnlockTime(id: string, lastPulse: number, unlockTime: number): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (!seal) {
      throw new Error(`Failed to update pulse and unlock time for seal ${id}`);
    }
    seal.lastPulse = lastPulse;
    seal.unlockTime = unlockTime;
    this.store.getSeals().set(id, seal);
  }

  async deleteSeal(id: string): Promise<void> {
    this.store.getSeals().delete(id);
    this.store.getBlobs().delete(id);
  }

  async getSealByPulseToken(token: string): Promise<SealRecord | null> {
    for (const seal of this.store.getSeals().values()) {
      if (seal.pulseToken === token) {
        return seal;
      }
    }
    return null;
  }

  async getExpiredDMS(): Promise<SealRecord[]> {
    const now = Date.now();
    return Array.from(this.store.getSeals().values()).filter(
      s => s.isDMS && s.lastPulse !== undefined && s.pulseInterval !== undefined &&
        s.lastPulse + s.pulseInterval < now
    );
  }

  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    // Mock always allows (for dev)
    return { allowed: true, remaining: limit - 1 };
  }

  async storeNonce(nonce: string, expiresAt: number): Promise<boolean> {
    // Mock always accepts (for dev)
    return true;
  }
}

// Helpers for Blob Storage
export function storeMockBlob(id: string, blob: ArrayBuffer) {
  MockStore.getInstance().getBlobs().set(id, blob);
}

export function getMockBlob(id: string): ArrayBuffer | undefined {
  return MockStore.getInstance().getBlobs().get(id);
}

// Factory
export function createDatabase(env?: { DB?: D1Database }): DatabaseProvider {
  if (env?.DB) {
    return new SealDatabase(env.DB);
  }
  console.warn('No D1 binding found, using MockDatabase');
  return new MockDatabase();
}
