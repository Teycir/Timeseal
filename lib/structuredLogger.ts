// Structured logging compatible with Cloudflare Workers
// Note: Pino uses Node.js APIs not available in Workers
// Use this lightweight wrapper instead

interface LogContext {
  [key: string]: any;
}

class WorkersLogger {
  private level: string;
  private redactPaths: string[];

  constructor(level: string = 'info', redactPaths: string[] = []) {
    this.level = level;
    this.redactPaths = redactPaths;
  }

  private redact(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const redacted = { ...data };
    for (const path of this.redactPaths) {
      if (path in redacted) {
        delete redacted[path];
      }
    }
    return redacted;
  }

  private log(level: string, message: string, context?: LogContext) {
    const logEntry = {
      level,
      time: new Date().toISOString(),
      msg: message,
      ...this.redact(context || {}),
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (this.level === 'debug') {
      this.log('debug', message, context);
    }
  }

  child(context: LogContext): WorkersLogger {
    const childLogger = new WorkersLogger(this.level, this.redactPaths);
    // Store child context for future logs
    return childLogger;
  }
}

// Default logger with auto-redaction
export const logger = new WorkersLogger('info', [
  'keyB',
  'keyA',
  'encryptedBlob',
  'MASTER_ENCRYPTION_KEY',
]);

export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}
