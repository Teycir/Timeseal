// Database Abstraction Layer
export interface DatabaseProvider {
  createSeal(data: SealRecord): Promise<void>;
  getSeal(id: string): Promise<SealRecord | null>;
  getSealByPulseToken(token: string): Promise<SealRecord | null>;
  updatePulse(id: string, timestamp: number): Promise<void>;
  updateUnlockTime(id: string, unlockTime: number): Promise<void>;
  getExpiredDMS(): Promise<SealRecord[]>;
}

export interface SealRecord {
  id: string;
  unlockTime: number;
  isDMS: boolean;
  pulseInterval?: number;
  lastPulse?: number;
  keyB: string;
  iv: string;
  hmac: string;
  pulseToken?: string;
  createdAt: number;
}

// Production D1 Database
export class D1Database implements DatabaseProvider {
  constructor(private db: D1Database) { }

  private mapResultToSealRecord(result: any): SealRecord {
    return {
      id: String(result.id || ''),
      unlockTime: Number(result.unlock_time || 0),
      isDMS: result.is_dms === 1,
      pulseInterval: result.pulse_interval ? Number(result.pulse_interval) : undefined,
      lastPulse: result.last_pulse ? Number(result.last_pulse) : undefined,
      keyB: String(result.key_b || ''),
      iv: String(result.iv || ''),
      hmac: String(result.hmac || ''),
      pulseToken: result.pulse_token ? String(result.pulse_token) : undefined,
      createdAt: Number(result.created_at || 0),
    };
  }

  async createSeal(data: SealRecord): Promise<void> {
    const result = await this.db.prepare(
      `INSERT INTO seals (id, unlock_time, is_dms, pulse_interval, last_pulse, key_b, iv, hmac, pulse_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.id,
      data.unlockTime,
      data.isDMS ? 1 : 0,
      data.pulseInterval || null,
      data.lastPulse || null,
      data.keyB,
      data.iv,
      data.hmac,
      data.pulseToken || null,
      data.createdAt
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
       AND last_pulse + pulse_interval < ?`
    ).bind(Date.now()).all();

    return results.results.map((r: any) => this.mapResultToSealRecord(r));
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

  async updatePulse(id: string, timestamp: number): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (seal) {
      seal.lastPulse = timestamp;
      this.store.getSeals().set(id, seal);
    }
  }

  async updateUnlockTime(id: string, unlockTime: number): Promise<void> {
    const seal = this.store.getSeals().get(id);
    if (seal) {
      seal.unlockTime = unlockTime;
      this.store.getSeals().set(id, seal);
    }
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
      s => s.isDMS && s.lastPulse && s.pulseInterval &&
        s.lastPulse + s.pulseInterval < now
    );
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
  if (process.env.NODE_ENV === 'production' && env?.DB) {
    return new D1Database(env.DB);
  }
  return new MockDatabase();
}
