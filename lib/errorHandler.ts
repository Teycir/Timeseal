/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling patterns across all API routes
 */

import { ErrorCode, createErrorResponse } from "./errors";
import { logger } from "./logger";
import { ErrorLogger } from "./errorLogger";

export interface ErrorContext {
  component: string;
  action: string;
  ip?: string;
  sealId?: string;
  [key: string]: unknown;
}

/**
 * Standardized error handler for API routes
 * Logs errors consistently and returns appropriate responses
 */
export async function handleAPIError(
  error: unknown,
  context: ErrorContext,
): Promise<Response> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log to structured logger
  logger.error("api_error", error as Error, {
    ...context,
    message: errorMessage,
  });

  // Log to error logger for tracking
  ErrorLogger.log(error, context);

  // Map known error messages to error codes
  if (errorMessage.includes("not found")) {
    return createErrorResponse(ErrorCode.SEAL_NOT_FOUND, errorMessage);
  }

  if (errorMessage.includes("locked")) {
    return createErrorResponse(ErrorCode.SEAL_LOCKED, errorMessage);
  }

  if (errorMessage.includes("decrypt") || errorMessage.includes("fetch seal content")) {
    return createErrorResponse(ErrorCode.DECRYPTION_FAILED, errorMessage);
  }

  if (errorMessage.includes("Invalid") || errorMessage.includes("required")) {
    return createErrorResponse(ErrorCode.INVALID_INPUT, errorMessage);
  }

  if (errorMessage.includes("Replay attack")) {
    return createErrorResponse(ErrorCode.INVALID_INPUT, errorMessage);
  }

  if (errorMessage.includes("Rate limit")) {
    return createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, errorMessage);
  }

  // Default to internal error
  const isDev = process.env.NODE_ENV !== "production";
  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    isDev ? errorMessage : undefined,
  );
}

/**
 * Wraps an async handler with consistent error handling
 */
export function withErrorHandler<
  T extends (...args: any[]) => Promise<Response>,
>(handler: T, context: ErrorContext): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error, context);
    }
  }) as T;
}
