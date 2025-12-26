// Dependency Injection Container
import { SealDatabase } from "./database";
import { SealService } from "./sealService";
import { AuditLogger } from "./auditLogger";
import { createStorage } from "./storage";
import { logger, createChildLogger } from "./structuredLogger";
import type { D1Database } from "@cloudflare/workers-types";

interface CloudflareEnv {
  DB: D1Database; // Required, not optional
  MASTER_ENCRYPTION_KEY: string; // Required, not optional
  MASTER_ENCRYPTION_KEY_OLD?: string; // Optional, for key rotation
  METRICS_SECRET?: string; // Optional
}

export interface Container {
  sealService: SealService;
  storage: any;
  database: SealDatabase;
  db: D1Database; // Always D1Database
  auditLogger: AuditLogger;
  logger: typeof logger;
  createLogger: typeof createChildLogger;
  masterKey: string;
}

export function createContainer(env: CloudflareEnv): Container {
  console.log('[Container] Creating container');
  if (!env.MASTER_ENCRYPTION_KEY) {
    console.error('[Container] MASTER_ENCRYPTION_KEY missing');
    throw new Error("MASTER_ENCRYPTION_KEY not configured in environment");
  }

  if (!env.DB) {
    console.error('[Container] DB missing');
    throw new Error("D1 database not configured in environment");
  }

  console.log('[Container] Creating storage');
  const storage = createStorage(env);
  console.log('[Container] Creating database');
  const database = new SealDatabase(env.DB);
  console.log('[Container] Creating audit logger');
  const auditLogger = new AuditLogger(env.DB);
  console.log('[Container] Creating seal service');
  const masterKeys = [env.MASTER_ENCRYPTION_KEY];
  if (env.MASTER_ENCRYPTION_KEY_OLD) {
    masterKeys.push(env.MASTER_ENCRYPTION_KEY_OLD);
    console.log('[Container] Using dual-key rotation mode');
  }
  const sealService = new SealService(
    storage,
    database,
    masterKeys,
    auditLogger,
  );

  console.log('[Container] Container created successfully');
  return {
    sealService,
    storage,
    database,
    db: env.DB,
    auditLogger,
    logger,
    createLogger: createChildLogger,
    masterKey: env.MASTER_ENCRYPTION_KEY,
  };
}
