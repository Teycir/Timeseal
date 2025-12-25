// Database Abstraction Layer
import type { D1Database } from "@cloudflare/workers-types";
import { timingSafeEqual } from "./timingSafe";

export interface DatabaseProvider {
  createSeal(data: SealRecord): Promise<void>;
  getSeal(id: string): Promise<SealRecord | null>;
  getSealByPulseToken(token: string): Promise<SealRecord | null>;
  updatePulse(id: string, timestamp: number): Promise<void>;
  updateUnlockTime(id: string, unlockTime: number): Promise<void>;
  updatePulseAndUnlockTime(
    id: string,
    lastPulse: number,
    unlockTime: number,
    expiresAt?: number,
  ): Promise<void>;
  incrementAccessCount(id: string): Promise<void>;
  decrementViewCount(id: string): Promise<void>;
  deleteSeal(id: string): Promise<void>;
  getExpiredDMS(): Promise<SealRecord[]>;
  checkRateLimit(
    key: string,
    limit: number,
    window: number,
  ): Promise<{ allowed: boolean; remaining: number }>;
  storeNonce(nonce: string, expiresAt: number): Promise<boolean>;
  recordEphemeralView(
    sealId: string,
    fingerprint: string,
    timestamp: number,
  ): Promise<number>;
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
  // Ephemeral seal fields
  isEphemeral?: boolean;
  maxViews?: number | null;
  viewCount?: number;
  firstViewedAt?: number | null;
  firstViewerFingerprint?: string | null;
}

// Production D1 Database
export class SealDatabase implements DatabaseProvider {
  constructor(private readonly db: D1Database) {}

  private mapResultToSealRecord(result: any): SealRecord {
    // Fail-fast validation - throw on missing required fields
    if (!result.id) throw new Error("Invalid seal record: missing id");
    if (!result.key_b) throw new Error("Invalid seal record: missing key_b");
    if (!result.iv) throw new Error("Invalid seal record: missing iv");
    if (result.unlock_time === null || result.unlock_time === undefined) {
      throw new Error("Invalid seal record: missing unlock_time");
    }

    return {
      id: String(result.id),
      unlockTime: (() => {
        const v = Number(result.unlock_time);
        if (isNaN(v)) throw new Error("Invalid unlock_time");
        return v;
      })(),
      isDMS: result.is_dms === 1,
      pulseInterval: result.pulse_interval
        ? (() => {
            const v = Number(result.pulse_interval);
            if (isNaN(v)) throw new Error("Invalid pulse_interval");
            return v;
          })()
        : undefined,
      lastPulse: result.last_pulse
        ? (() => {
            const v = Number(result.last_pulse);
            if (isNaN(v)) throw new Error("Invalid last_pulse");
            return v;
          })()
        : undefined,
      keyB: String(result.key_b),
      iv: String(result.iv),
      pulseToken: result.pulse_token ? String(result.pulse_token) : undefined,
      createdAt: (() => {
        const v = Number(result.created_at || Date.now());
        if (isNaN(v)) throw new Error("Invalid created_at");
        return v;
      })(),
      blobHash: result.blob_hash ? String(result.blob_hash) : undefined,
      unlockMessage: result.unlock_message
        ? String(result.unlock_message)
        : undefined,
      expiresAt: result.expires_at
        ? (() => {
            const v = Number(result.expires_at);
            if (isNaN(v)) throw new Error("Invalid expires_at");
            return v;
          })()
        : undefined,
      accessCount: (() => {
        const v = Number(result.access_count || 0);
        if (isNaN(v)) throw new Error("Invalid access_count");
        return v;
      })(),
      // Ephemeral fields
      isEphemeral: result.is_ephemeral === 1,
      maxViews:
        result.max_views !== null
          ? (() => {
              const v = Number(result.max_views);
              if (isNaN(v)) throw new Error("Invalid max_views");
              return v;
            })()
          : null,
      viewCount: (() => {
        const v = Number(result.view_count || 0);
        if (isNaN(v)) throw new Error("Invalid view_count");
        return v;
      })(),
      firstViewedAt: result.first_viewed_at
        ? (() => {
            const v = Number(result.first_viewed_at);
            if (isNaN(v)) throw new Error("Invalid first_viewed_at");
            return v;
          })()
        : null,
      firstViewerFingerprint: result.first_viewer_fingerprint
        ? String(result.first_viewer_fingerprint)
        : null,
    };
  }

  async createSeal(data: SealRecord): Promise<void> {
    const result = await this.db
      .prepare(
        `INSERT INTO seals (id, unlock_time, is_dms, pulse_interval, last_pulse, key_b, iv, pulse_token, created_at, blob_hash, unlock_message, expires_at, access_count, is_ephemeral, max_views, view_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
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
        data.accessCount || 0,
        data.isEphemeral ? 1 : 0,
        data.maxViews !== undefined ? data.maxViews : null,
        data.viewCount || 0,
      )
      .run();

    if (!result.success) {
      throw new Error(`Failed to create seal ${data.id} in database`);
    }
  }

  async getSeal(id: string): Promise<SealRecord | null> {
    const result = await this.db
      .prepare("SELECT * FROM seals WHERE id = ?")
      .bind(id)
      .first();

    if (!result) return null;
    return this.mapResultToSealRecord(result);
  }

  async incrementAccessCount(id: string): Promise<void> {
    const result = await this.db
      .prepare("UPDATE seals SET access_count = access_count + 1 WHERE id = ?")
      .bind(id)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new Error(`Seal ${id} not found`);
    }
  }

  async decrementViewCount(id: string): Promise<void> {
    const result = await this.db
      .prepare(
        "UPDATE seals SET view_count = CASE WHEN view_count > 0 THEN view_count - 1 ELSE 0 END WHERE id = ?",
      )
      .bind(id)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new Error(`Seal ${id} not found`);
    }
  }

  async updatePulse(id: string, timestamp: number): Promise<void> {
    const result = await this.db
      .prepare("UPDATE seals SET last_pulse = ? WHERE id = ?")
      .bind(timestamp, id)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new Error(`Seal ${id} not found`);
    }
  }

  async updateUnlockTime(id: string, unlockTime: number): Promise<void> {
    const result = await this.db
      .prepare("UPDATE seals SET unlock_time = ? WHERE id = ?")
      .bind(unlockTime, id)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new Error(`Seal ${id} not found`);
    }
  }

  async updatePulseAndUnlockTime(
    id: string,
    lastPulse: number,
    unlockTime: number,
    expiresAt?: number,
  ): Promise<void> {
    let query = "UPDATE seals SET last_pulse = ?, unlock_time = ?";
    const params: any[] = [lastPulse, unlockTime];

    if (expiresAt !== undefined) {
      query += ", expires_at = ?";
      params.push(expiresAt);
    }

    query += " WHERE id = ?";
    params.push(id);

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).run();

    if (!result.success || result.meta.changes === 0) {
      throw new Error(`Seal ${id} not found`);
    }
  }

  async deleteSeal(id: string): Promise<void> {
    const result = await this.db
      .prepare("DELETE FROM seals WHERE id = ?")
      .bind(id)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new Error(`Seal ${id} not found`);
    }
  }

  async getSealByPulseToken(token: string): Promise<SealRecord | null> {
    const result = await this.db
      .prepare("SELECT * FROM seals WHERE pulse_token = ?")
      .bind(token)
      .first();

    if (!result) return null;

    const seal = this.mapResultToSealRecord(result);

    // Timing-safe comparison to prevent timing attacks
    if (seal.pulseToken && !timingSafeEqual(seal.pulseToken, token)) {
      return null;
    }

    return seal;
  }

  async getExpiredDMS(): Promise<SealRecord[]> {
    const results = await this.db
      .prepare(
        `SELECT * FROM seals
       WHERE is_dms = 1
       AND last_pulse IS NOT NULL
       AND pulse_interval IS NOT NULL
       AND last_pulse + pulse_interval < ?`,
      )
      .bind(Date.now())
      .all();

    return results.results.map((r: any) => this.mapResultToSealRecord(r));
  }

  async checkRateLimit(
    key: string,
    limit: number,
    window: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now;

    // Atomic upsert to prevent race conditions
    const result = (await this.db
      .prepare(
        `
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
        reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
      RETURNING count, reset_at
    `,
      )
      .bind(key, windowStart + window, now, now, windowStart + window)
      .first()) as { count: number; reset_at: number } | null;

    if (!result) return { allowed: false, remaining: 0 };

    const allowed = result.count <= limit;
    const remaining = Math.max(0, limit - result.count);
    return { allowed, remaining };
  }

  async storeNonce(nonce: string, expiresAt: number): Promise<boolean> {
    try {
      const result = await this.db
        .prepare("INSERT INTO nonces (nonce, expires_at) VALUES (?, ?)")
        .bind(nonce, expiresAt)
        .run();
      return result.success;
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes("UNIQUE")) {
        console.warn("[SECURITY] Replay attack detected");
      } else {
        console.error("[DB] Nonce storage failed");
      }
      return false;
    }
  }

  // FIX #8: Race-condition safe view recording with optimistic locking
  async recordEphemeralView(
    sealId: string,
    fingerprint: string,
    timestamp: number,
  ): Promise<number> {
    // Use WHERE clause to check exhaustion atomically
    const result = (await this.db
      .prepare(
        `
      UPDATE seals 
      SET view_count = view_count + 1,
      first_viewed_at = COALESCE(first_viewed_at, ?),
      first_viewer_fingerprint = COALESCE(first_viewer_fingerprint, ?)
      WHERE id = ?
      AND (max_views IS NULL OR view_count < max_views)
      RETURNING view_count
    `,
      )
      .bind(timestamp, fingerprint, sealId)
      .first()) as { view_count: number } | null;

    if (!result) {
      // Check if seal exists or is exhausted
      const seal = (await this.db
        .prepare("SELECT view_count, max_views FROM seals WHERE id = ?")
        .bind(sealId)
        .first()) as { view_count: number; max_views: number | null } | null;

      if (!seal) {
        throw new Error(`Seal ${sealId} not found or already deleted`);
      }
      // Seal exists but exhausted
      throw new Error(`Seal ${sealId} already exhausted`);
    }
    return result.view_count;
  }
}

// Singleton pattern for global mock store
class MockStore {
  private static instance: MockStore;
  private seals = new Map<string, SealRecord>();
  private blobs = new Map<string, ArrayBuffer>();

  private constructor() {}

  static getInstance(): MockStore {
    if (!MockStore.instance) {
      MockStore.instance = new MockStore();
    }
    return MockStore.instance;
  }

  getSeals() {
    return this.seals;
  }
  getBlobs() {
    return this.blobs;
  }

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

  async decrementViewCount(id: string): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (seal && seal.viewCount && seal.viewCount > 0) {
      seal.viewCount -= 1;
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

  async updatePulseAndUnlockTime(
    id: string,
    lastPulse: number,
    unlockTime: number,
    expiresAt?: number,
  ): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (!seal) {
      throw new Error(`Failed to update pulse and unlock time for seal ${id}`);
    }
    seal.lastPulse = lastPulse;
    seal.unlockTime = unlockTime;
    if (expiresAt !== undefined) {
      seal.expiresAt = expiresAt;
    }
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
      (s) =>
        s.isDMS &&
        s.lastPulse !== undefined &&
        s.pulseInterval !== undefined &&
        s.lastPulse + s.pulseInterval < now,
    );
  }

  async checkRateLimit(
    key: string,
    limit: number,
    window: number,
  ): Promise<{ allowed: boolean; remaining: number }> {
    // Mock always allows (for dev)
    return { allowed: true, remaining: limit - 1 };
  }

  async storeNonce(nonce: string, expiresAt: number): Promise<boolean> {
    // Mock always accepts (for dev)
    return true;
  }

  async recordEphemeralView(
    sealId: string,
    fingerprint: string,
    timestamp: number,
  ): Promise<number> {
    const seal = this.store.getSeals().get(sealId);
    if (!seal) {
      throw new Error(`Failed to record view for seal ${sealId}`);
    }

    seal.viewCount = (seal.viewCount || 0) + 1;
    if (!seal.firstViewedAt) {
      seal.firstViewedAt = timestamp;
      seal.firstViewerFingerprint = fingerprint;
    }
    this.store.getSeals().set(sealId, seal);
    return seal.viewCount;
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
  console.warn("No D1 binding found, using MockDatabase");
  return new MockDatabase();
}
