// API Helper Utilities - Factored common patterns
import { jsonResponse } from "./apiHandler";
import { validateHTTPMethod, validateOrigin } from "./security";
import { ValidationResult } from "./validation";
import { NextRequest } from "next/server";
import { BASE64_CHUNK_SIZE } from "./constants";

/**
 * Standard API security checks (HTTP method + origin validation)
 */
export function validateAPIRequest(
  request: NextRequest,
  allowedMethods: string[],
): Response | null {
  if (!validateHTTPMethod(request, allowedMethods)) {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!validateOrigin(request)) {
    return jsonResponse({ error: "Invalid origin" }, { status: 403 });
  }

  return null; // No error
}

/**
 * Validate and return error response if invalid
 */
export function checkValidation(
  validation: ValidationResult,
  statusCode: number = 400,
): Response | null {
  if (!validation.valid) {
    return jsonResponse({ error: validation.error }, { status: statusCode });
  }
  return null;
}

/**
 * Track analytics event (non-blocking)
 */
export async function trackAnalytics(
  db: any,
  eventType: 'page_view' | 'seal_created' | 'seal_unlocked' | 'pulse_received' | 'seal_deleted',
): Promise<void> {
  try {
    const { AnalyticsService } = await import("./analytics");
    const analytics = new AnalyticsService(db);
    await analytics.trackEvent({ eventType });
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Chunked base64 encoding for large blobs (prevents stack overflow)
 */
export function encodeBase64Chunked(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i += BASE64_CHUNK_SIZE) {
    const chunk = data.subarray(
      i,
      Math.min(i + BASE64_CHUNK_SIZE, data.length),
    );
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Validate multiple fields and return first error
 */
export function validateFields(
  validations: Array<{ validation: ValidationResult; statusCode?: number }>,
): Response | null {
  for (const { validation, statusCode = 400 } of validations) {
    const error = checkValidation(validation, statusCode);
    if (error) return error;
  }
  return null;
}
