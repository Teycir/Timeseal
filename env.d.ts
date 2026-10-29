interface CloudflareEnv {
  DB: D1Database;
  MASTER_ENCRYPTION_KEY: string;
  MASTER_ENCRYPTION_KEY_OLD?: string;
  METRICS_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
}

declare module '@cloudflare/next-on-pages' {
  export function getRequestContext<T = CloudflareEnv>(): {
    env: T;
    cf: CfProperties;
    ctx: ExecutionContext;
  };
}
