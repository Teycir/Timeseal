// Rate Limiting Middleware for Cloudflare Workers
export interface RateLimitConfig {
  limit: number;
  window: number; // milliseconds
}

export class RateLimiter {
  private config: RateLimitConfig;
  private cache: Map<string, { count: number; resetAt: number }>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.cache = new Map();
  }

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
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
}

// Singleton pattern for rate limiters
class RateLimiterRegistry {
  private static instance: RateLimiterRegistry;
  private limiters = new Map<string, RateLimiter>();

  private constructor() {}

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
  config: RateLimitConfig = { limit: 10, window: 60000 }
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  const key = `${config.limit}:${config.window}`;
  const limiter = RateLimiterRegistry.getInstance().getLimiter(key, config);
  
  const { allowed, remaining } = await limiter.check(ip);

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
