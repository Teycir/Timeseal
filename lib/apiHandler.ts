// API Handler Abstraction
import { withRateLimit } from './rateLimit';
import { handleError } from './errors';
import { logger } from './logger';
import { ErrorLogger } from './errorLogger';
import { compose, createMiddleware, type Middleware, type Context, type Handler } from './middleware';
import { jsonResponse, parseJSON, corsResponse, optionsResponse } from './http';

export type { Handler, Middleware, Context };
export { compose, createMiddleware, jsonResponse, parseJSON };

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
    const errorDetails = {
      url: ctx.request.url,
      method: ctx.request.method,
      ip: ctx.ip,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    
    console.error('[ERROR HANDLER] ===== ERROR CAUGHT =====');
    console.error('[ERROR HANDLER] Message:', errorDetails.message);
    console.error('[ERROR HANDLER] Stack:', errorDetails.stack);
    console.error('[ERROR HANDLER] URL:', errorDetails.url);
    console.error('[ERROR HANDLER] Method:', errorDetails.method);
    
    logger.error('request_error', error as Error, errorDetails);
    
    // Enhanced error logging
    ErrorLogger.log(error, {
      component: 'API',
      action: `${ctx.request.method} ${new URL(ctx.request.url).pathname}`,
      ip: ctx.ip,
      url: ctx.request.url,
    });
    
    return handleError(error);
  }
};

export const withCORS: Middleware = async (ctx, next) => {
  if (ctx.request.method === 'OPTIONS') {
    return optionsResponse();
  }
  const response = await next(ctx);
  return corsResponse(response);
};



// Create handler with default middlewares
export function createHandler(handler: Handler): Handler {
  const middleware = compose(
    withLogging,
    withErrorHandling,
    withCORS
  );
  
  return async (ctx) => middleware(ctx, handler);
}
