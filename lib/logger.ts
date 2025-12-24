// Structured Logging for Audit Trails
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  AUDIT = 'audit',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  sealId?: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

// Sanitize user input to prevent log injection
function sanitizeLogInput(value: any): string {
  if (value === null || value === undefined) return 'null';
  const str = String(value);
  return str.replace(/[\r\n\t]/g, '_').slice(0, 200);
}

export class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  private log(entry: LogEntry): void {
    if (process.env.ENABLE_AUDIT_LOGS === 'false' && entry.level === LogLevel.AUDIT) {
      return;
    }
    // Sanitize all string fields to prevent log injection
    const sanitized = {
      ...entry,
      sealId: entry.sealId ? sanitizeLogInput(entry.sealId) : undefined,
      userId: entry.userId ? sanitizeLogInput(entry.userId) : undefined,
      ip: entry.ip ? sanitizeLogInput(entry.ip) : undefined,
      metadata: entry.metadata ? Object.fromEntries(
        Object.entries(entry.metadata).map(([k, v]) => [k, sanitizeLogInput(v)])
      ) : undefined,
    };
    console.log(JSON.stringify(sanitized));
  }

  audit(event: string, data: Partial<LogEntry>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.AUDIT,
      event,
      ...data,
    });
  }

  info(event: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      event,
      metadata,
    });
  }

  error(event: string, error: Error, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      event,
      metadata: {
        ...metadata,
        error: error.message,
        stack: error.stack,
      },
    });
  }

  warn(event: string, metadata?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      event,
      metadata,
    });
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
);

// Audit event helpers
export function auditSealCreated(sealId: string, ip: string, isDMS: boolean, userAgent?: string): void {
  logger.audit('seal_created', {
    sealId,
    ip,
    metadata: { isDMS, userAgent: userAgent || 'unknown' },
  });
}

export function auditSealAccessed(sealId: string, ip: string, status: 'locked' | 'unlocked', userAgent?: string): void {
  logger.audit('seal_accessed', {
    sealId,
    ip,
    metadata: { status, userAgent: userAgent || 'unknown' },
  });
}

export function auditPulseReceived(sealId: string, ip: string): void {
  logger.audit('pulse_received', {
    sealId,
    ip,
  });
}
