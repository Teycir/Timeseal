// Database utilities for Cloudflare D1
import { TimeSeal } from './types';

// Mock D1 database for local development
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first(): Promise<Record<string, unknown> | null>;
  run(): Promise<D1Result>;
}

interface D1Result {
  success: boolean;
  meta: {
    last_row_id: number;
  };
}

// Database schema
export const DB_SCHEMA = `
CREATE TABLE IF NOT EXISTS seals (
  id TEXT PRIMARY KEY,
  key_b TEXT NOT NULL,
  iv TEXT NOT NULL,
  unlock_time INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  pulse_token TEXT,
  pulse_duration INTEGER,
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_unlock_time ON seals(unlock_time);
CREATE INDEX IF NOT EXISTS idx_pulse_token ON seals(pulse_token);
`;

export class Database {
  constructor(private db: D1Database) { }

  async createSeal(seal: Omit<TimeSeal, 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    await this.db
      .prepare(`
        INSERT INTO seals (id, key_b, iv, unlock_time, created_at, pulse_token, pulse_duration, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        seal.keyB,
        seal.iv,
        seal.unlockTime,
        createdAt,
        seal.pulseToken || null,
        seal.pulseDuration || null,
        seal.isActive ? 1 : 0
      )
      .run();

    return id;
  }

  async getSeal(id: string): Promise<TimeSeal | null> {
    const result = await this.db
      .prepare('SELECT * FROM seals WHERE id = ? AND is_active = 1')
      .bind(id)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      keyB: result.key_b as string,
      iv: result.iv as string,
      unlockTime: result.unlock_time as number,
      createdAt: result.created_at as number,
      pulseToken: result.pulse_token as string | undefined,
      pulseDuration: result.pulse_duration as number | undefined,
      isActive: result.is_active === 1,
    };
  }

  async updateUnlockTime(pulseToken: string, newUnlockTime: number): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE seals SET unlock_time = ? WHERE pulse_token = ? AND is_active = 1')
      .bind(newUnlockTime, pulseToken)
      .run();

    return result.success;
  }

  async deactivateSeal(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE seals SET is_active = 0 WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }
}

// Global mock store for local development persistence
const globalMockStore = {
  seals: new Map<string, any>(),
  blobs: new Map<string, ArrayBuffer>(), // Store encrypted blobs
};

// Mock database for local development
export function createMockDB(): D1Database {
  return {
    prepare(query: string) {
      // Very basic SQL parser for our specific queries
      const isInsert = query.trim().toUpperCase().startsWith('INSERT');
      const isSelect = query.trim().toUpperCase().startsWith('SELECT');
      const isUpdate = query.trim().toUpperCase().startsWith('UPDATE');

      let boundValues: any[] = [];

      return {
        bind(...values: any[]) {
          boundValues = values;
          return this;
        },
        async first() {
          if (isSelect) {
            // SELECT * FROM seals WHERE id = ? AND is_active = 1
            const id = boundValues[0];
            const seal = globalMockStore.seals.get(id);

            if (seal && seal.is_active === 1) {
              return seal;
            }
          }
          return null;
        },
        async run() {
          if (isInsert) {
            // INSERT INTO seals ...
            const id = boundValues[0];
            const seal = {
              id: boundValues[0],
              key_b: boundValues[1],
              iv: boundValues[2],
              unlock_time: boundValues[3],
              created_at: boundValues[4],
              pulse_token: boundValues[5],
              pulse_duration: boundValues[6],
              is_active: boundValues[7]
            };
            globalMockStore.seals.set(id, seal);
            return { success: true, meta: { last_row_id: 1 } };
          }

          if (isUpdate) {
            if (query.includes('unlock_time')) {
              // UPDATE seals SET unlock_time = ? WHERE pulse_token = ?
              const newTime = boundValues[0];
              const token = boundValues[1];

              for (const [id, seal] of globalMockStore.seals) {
                if (seal.pulse_token === token && seal.is_active === 1) {
                  seal.unlock_time = newTime;
                  globalMockStore.seals.set(id, seal);
                  return { success: true, meta: { last_row_id: 1 } };
                }
              }
            } else if (query.includes('is_active')) {
              // UPDATE seals SET is_active = 0 WHERE id = ?
              const id = boundValues[0];
              const seal = globalMockStore.seals.get(id);
              if (seal) {
                seal.is_active = 0;
                globalMockStore.seals.set(id, seal);
                return { success: true, meta: { last_row_id: 1 } };
              }
            }
          }

          return { success: true, meta: { last_row_id: 1 } };
        }
      };
    }
  };
}

// Helper to store blobs in our global mock
export function storeMockBlob(id: string, blob: ArrayBuffer) {
  globalMockStore.blobs.set(id, blob);
}

export function getMockBlob(id: string): ArrayBuffer | undefined {
  return globalMockStore.blobs.get(id);
}