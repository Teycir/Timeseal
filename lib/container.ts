// Dependency Injection Container
export class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  resolve<T>(name: string): T {
    // Check if already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check if factory exists
    if (this.factories.has(name)) {
      const instance = this.factories.get(name)!();
      this.services.set(name, instance);
      return instance;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Global container instance
export const container = new Container();

// Service registration helper
export function createContainer(env?: any) {
  const c = new Container();

  // Register storage
  c.registerFactory('storage', () => {
    const { createStorage } = require('./storage');
    return createStorage(env);
  });

  // Register database
  c.registerFactory('database', () => {
    const { createDatabase } = require('./database');
    return createDatabase(env);
  });

  // Register seal service
  c.registerFactory('sealService', () => {
    const { SealService } = require('./sealService');
    const storage = c.resolve('storage');
    const database = c.resolve('database');
    return new SealService(storage, database);
  });

  // Register logger
  c.registerFactory('logger', () => {
    const { logger } = require('./logger');
    return logger;
  });

  // Register metrics
  c.registerFactory('metrics', () => {
    const { metrics } = require('./metrics');
    return metrics;
  });

  return c;
}
