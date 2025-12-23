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
  if (!env.MASTER_ENCRYPTION_KEY) {
    throw new Error("MASTER_ENCRYPTION_KEY not configured in environment");
  }

  if (!env.DB) {
    throw new Error("D1 database not configured in environment");
  }

  const storage = createStorage(env);
  const database = new SealDatabase(env.DB);
  const auditLogger = new AuditLogger(env.DB);
  const sealService = new SealService(
    storage,
    database,
    env.MASTER_ENCRYPTION_KEY,
    auditLogger,
  );

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
