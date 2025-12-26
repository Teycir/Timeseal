// Rate Limiting Middleware for Cloudflare Workers
import { DatabaseProvider } from './database';

export interface RateLimitConfig {
  limit: number;
  window: number;
  key?: string;
  db?: DatabaseProvider;
}

export class RateLimiter {
  private readonly config: RateLimitConfig;
  private readonly cache: Map<string, { count: number; resetAt: number }>;
  private lastCleanup: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.cache = new Map();
    this.lastCleanup = Date.now();
  }

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();

    // Lazy cleanup to prevent memory leaks
    if (this.cache.size > 5000 && now - this.lastCleanup > 60000) {
      this.cleanup();
      this.lastCleanup = now;
    }

    const record = this.cache.get(identifier);

    if (!record || now > record.resetAt) {
      this.cache.set(identifier, {
        count: 1,
        resetAt: now + this.config.window,
      });
      return { allowed: true, remaining: this.config.limit - 1 };
    }

    if (record.count >= this.config.limit) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: this.config.limit - record.count };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.cache.entries()) {
      if (now > record.resetAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton pattern for rate limiters
class RateLimiterRegistry {
  private static instance: RateLimiterRegistry;
  private limiters = new Map<string, RateLimiter>();

  private constructor() { }

  static getInstance(): RateLimiterRegistry {
    if (!RateLimiterRegistry.instance) {
      RateLimiterRegistry.instance = new RateLimiterRegistry();
    }
    return RateLimiterRegistry.instance;
  }

  getLimiter(key: string, config: RateLimitConfig): RateLimiter {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiter(config));
    }
    return this.limiters.get(key)!;
  }

  clear(): void {
    this.limiters.clear();
  }
}

// Usage in API routes
export async function withRateLimit(
  request: Request,
  handler: () => Promise<Response>,
  config: RateLimitConfig
): Promise<Response> {
  if (!config.db) {
    throw new Error("Database required for rate limiting");
  }

  const identifier = config.key || request.headers.get('CF-Connecting-IP') || 'unknown';
  const { allowed, remaining } = await config.db.checkRateLimit(identifier, config.limit, config.window);
  
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'Retry-After': Math.ceil(config.window / 1000).toString(),
        },
      }
    );
  }

  const response = await handler();
  response.headers.set('X-RateLimit-Limit', config.limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  return response;
}
