interface CloudflareEnv {
  DB: D1Database;
  MASTER_ENCRYPTION_KEY: string;
  METRICS_SECRET?: string;
}

declare module '@cloudflare/next-on-pages' {
  export function getRequestContext<T = CloudflareEnv>(): {
    env: T;
    cf: CfProperties;
    ctx: ExecutionContext;
  };
}
