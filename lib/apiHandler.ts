// API Handler Abstraction
import { withRateLimit } from './rateLimit';
import { handleError } from './errors';
import { logger } from './logger';

export interface HandlerContext {
  request: Request;
  env?: any;
  ip: string;
}

export type Handler = (ctx: HandlerContext) => Promise<Response>;

// Middleware composition
export function compose(...middlewares: Middleware[]): Middleware {
  return async (ctx, next) => {
    let index = 0;
    
    async function dispatch(i: number): Promise<Response> {
      if (i >= middlewares.length) {
        return next(ctx);
      }
      return middlewares[i](ctx, () => dispatch(i + 1));
    }
    
    return dispatch(0);
  };
}

export type Middleware = (
  ctx: HandlerContext,
  next: (ctx: HandlerContext) => Promise<Response>
) => Promise<Response>;

// Common middlewares
export const withLogging: Middleware = async (ctx, next) => {
  const start = Date.now();
  logger.info('request_start', {
    method: ctx.request.method,
    url: ctx.request.url,
    ip: ctx.ip,
  });
  
  const response = await next(ctx);
  
  logger.info('request_end', {
    method: ctx.request.method,
    url: ctx.request.url,
    status: response.status,
    duration: Date.now() - start,
  });
  
  return response;
};

export const withErrorHandling: Middleware = async (ctx, next) => {
  try {
    return await next(ctx);
  } catch (error) {
    logger.error('request_error', error as Error, {
      url: ctx.request.url,
      ip: ctx.ip,
    });
    return handleError(error);
  }
};

export const withCORS: Middleware = async (ctx, next) => {
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
  
  const response = await next(ctx);
  
  // Clone response to set headers safely
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers),
      'Access-Control-Allow-Origin': '*',
    },
  });
};

// JSON helper
export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Parse JSON body
export async function parseJSON<T>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

// Create handler with default middlewares
export function createHandler(handler: Handler): Handler {
  const middleware = compose(
    withLogging,
    withErrorHandling,
    withCORS
  );
  
  return async (ctx) => middleware(ctx, handler);
}
