import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createContainer } from './container';
import { createHandler, Context } from './apiHandler';
import { withRateLimit } from './rateLimit';
import { getRequestFingerprint } from './security';
import { createDatabase } from './database';

interface RouteHandlerOptions {
  rateLimit?: { limit: number; window: number };
}

interface CloudflareEnv {
  DB: any;
  MASTER_ENCRYPTION_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export function createAPIRoute(
  handler: (ctx: Context & { container: any }) => Promise<Response>,
  options: RouteHandlerOptions = {}
) {
  return async (request: NextRequest, routeParams?: any) => {
    console.log('[RouteHelper] Request received:', request.method, request.url);
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const fingerprint = await getRequestFingerprint(request);
    console.log('[RouteHelper] IP:', ip, 'Fingerprint:', fingerprint.substring(0, 8));
    const { env } = await getCloudflareContext<{ env: CloudflareEnv }>();
    console.log('[RouteHelper] Env keys:', Object.keys(env));
    
    const wrappedHandler = async () => {
      console.log('[RouteHelper] Creating container');
      const apiHandler = createHandler(async (ctx: Context) => {
        const container = createContainer(env);
        console.log('[RouteHelper] Container created, calling handler');
        return handler({ ...ctx, container });
      });
      
      console.log('[RouteHelper] Executing API handler');
      return apiHandler({ request, ip, env });
    };

    if (options.rateLimit) {
      console.log('[RouteHelper] Applying rate limit:', options.rateLimit);
      const db = createDatabase(env);
      return withRateLimit(request, wrappedHandler, { ...options.rateLimit, key: fingerprint, db });
    }
    
    return wrappedHandler();
  };
}
