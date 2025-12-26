// Centralized Error Handling
export enum ErrorCode {
  SEAL_NOT_FOUND = "SEAL_NOT_FOUND",
  SEAL_LOCKED = "SEAL_LOCKED",
  INVALID_KEY = "INVALID_KEY",
  INVALID_INPUT = "INVALID_INPUT",
  DECRYPTION_FAILED = "DECRYPTION_FAILED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INVALID_UNLOCK_TIME = "INVALID_UNLOCK_TIME",
  STORAGE_ERROR = "STORAGE_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

export interface AppError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  statusCode: number;
}

export const ErrorMessages: Record<ErrorCode, AppError> = {
  [ErrorCode.SEAL_NOT_FOUND]: {
    code: ErrorCode.SEAL_NOT_FOUND,
    message: "Seal does not exist",
    userMessage:
      "This seal could not be found. Please check the link and try again.",
    statusCode: 404,
  },
  [ErrorCode.SEAL_LOCKED]: {
    code: ErrorCode.SEAL_LOCKED,
    message: "Seal is still locked",
    userMessage:
      "This seal is still locked. Please wait until the unlock time.",
    statusCode: 403,
  },
  [ErrorCode.INVALID_KEY]: {
    code: ErrorCode.INVALID_KEY,
    message: "Invalid decryption key",
    userMessage:
      "The decryption key is invalid. Make sure you have the correct link.",
    statusCode: 400,
  },
  [ErrorCode.INVALID_INPUT]: {
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid input provided",
    userMessage: "The provided input is invalid. Please check and try again.",
    statusCode: 400,
  },
  [ErrorCode.DECRYPTION_FAILED]: {
    code: ErrorCode.DECRYPTION_FAILED,
    message: "Decryption failed",
    userMessage: "Failed to decrypt the seal. The data may be corrupted.",
    statusCode: 500,
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
    message: "Too many requests",
    userMessage: "Too many requests. Please wait a moment and try again.",
    statusCode: 429,
  },
  [ErrorCode.INVALID_UNLOCK_TIME]: {
    code: ErrorCode.INVALID_UNLOCK_TIME,
    message: "Invalid unlock time",
    userMessage: "The unlock time must be in the future.",
    statusCode: 400,
  },
  [ErrorCode.STORAGE_ERROR]: {
    code: ErrorCode.STORAGE_ERROR,
    message: "Storage operation failed",
    userMessage: "Failed to store the seal. Please try again.",
    statusCode: 500,
  },
  [ErrorCode.DATABASE_ERROR]: {
    code: ErrorCode.DATABASE_ERROR,
    message: "Database operation failed",
    userMessage: "A database error occurred. Please try again.",
    statusCode: 500,
  },
  [ErrorCode.INTERNAL_ERROR]: {
    code: ErrorCode.INTERNAL_ERROR,
    message: "Internal server error",
    userMessage: "An unexpected error occurred. Please try again.",
    statusCode: 500,
  },
};

export function createErrorResponse(
  code: ErrorCode,
  details?: string,
): Response {
  const error = ErrorMessages[code];
  const isDev = process.env.NODE_ENV !== 'production';
  
  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.userMessage,
        details,
        ...(isDev && { debugInfo: { statusCode: error.statusCode, internalMessage: error.message } }),
      },
    }),
    {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function handleError(error: unknown): Response {
  console.error("Error:", error);
  const isDev = process.env.NODE_ENV !== 'production';

  if (error instanceof Error) {
    if (error.message.includes("not found")) {
      return createErrorResponse(ErrorCode.SEAL_NOT_FOUND, isDev ? error.message : undefined);
    }
    if (error.message.includes("decrypt")) {
      return createErrorResponse(ErrorCode.DECRYPTION_FAILED, isDev ? error.message : undefined);
    }
    if (error.message.includes("Replay attack") || error.message.includes("already processed")) {
      return createErrorResponse(ErrorCode.INVALID_INPUT, error.message);
    }
    // Return error message in dev mode
    if (isDev) {
      return new Response(
        JSON.stringify({
          error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: error.message,
            stack: error.stack,
            debugInfo: { type: error.constructor.name },
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return createErrorResponse(ErrorCode.INTERNAL_ERROR, isDev ? String(error) : undefined);
}
