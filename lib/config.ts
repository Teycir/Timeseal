// Configuration Management
export interface AppConfig {
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  
  // Storage
  maxFileSizeMB: number;
  maxSealDurationDays: number;
  
  // Rate Limiting
  rateLimitEnabled: boolean;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableAuditLogs: boolean;
  
  // Security
  masterEncryptionKey?: string;
  
  // Features
  useMockStorage: boolean;
  useMockDatabase: boolean;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    return {
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100'),
      maxSealDurationDays: parseInt(process.env.MAX_SEAL_DURATION_DAYS || '365'),
      rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      enableAuditLogs: process.env.ENABLE_AUDIT_LOGS !== 'false',
      masterEncryptionKey: process.env.MASTER_ENCRYPTION_KEY,
      useMockStorage: process.env.USE_MOCK_STORAGE === 'true',
      useMockDatabase: process.env.USE_MOCK_DATABASE === 'true',
    };
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getAll(): Readonly<AppConfig> {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }

  validate(): void {
    const errors: string[] = [];

    if (this.isProduction()) {
      if (!this.config.masterEncryptionKey) {
        errors.push('MASTER_ENCRYPTION_KEY is required in production');
      }
      if (this.config.useMockStorage) {
        errors.push('Mock storage should not be used in production');
      }
      if (this.config.useMockDatabase) {
        errors.push('Mock database should not be used in production');
      }
    }

    if (this.config.maxFileSizeMB <= 0) {
      errors.push('MAX_FILE_SIZE_MB must be positive');
    }

    if (this.config.maxSealDurationDays <= 0) {
      errors.push('MAX_SEAL_DURATION_DAYS must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }
}

export const config = new ConfigManager();

// Validate on startup
if (typeof window === 'undefined') {
  try {
    config.validate();
  } catch (error) {
    console.error('Configuration error:', error);
    if (config.isProduction()) {
      process.exit(1);
    }
  }
}
