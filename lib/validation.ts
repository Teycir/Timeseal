// Input Validation (Legacy + Zod)
import {
  SealSchema,
  SealIdSchema,
  PulseTokenSchema,
  TimestampSchema,
} from "./schemas";
import { z } from "zod";
import {
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_BEFORE_ENCRYPTION,
  MAX_DURATION_DAYS,
  MIN_UNLOCK_DELAY,
  MAX_REQUEST_SIZE,
  MIN_PULSE_INTERVAL,
  MAX_PULSE_INTERVAL,
} from "./constants";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Zod-based validators
export function validateSealInput(data: unknown): ValidationResult {
  try {
    SealSchema.parse(data);
    return { valid: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { valid: false, error: err.issues[0].message };
    }
    return { valid: false, error: "Validation failed" };
  }
}

export function validateRequestSize(contentLength: number): ValidationResult {
  if (contentLength > MAX_REQUEST_SIZE) {
    return { valid: false, error: "Request too large" };
  }
  return { valid: true };
}

export function validateSealId(sealId: string): ValidationResult {
  try {
    SealIdSchema.parse(sealId);
    return { valid: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { valid: false, error: err.issues[0].message };
    }
    return { valid: false, error: "Invalid seal ID format" };
  }
}

export function validateKey(key: string, name: string): ValidationResult {
  if (!key || typeof key !== "string") {
    return { valid: false, error: `${name} is required` };
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(key)) {
    return { valid: false, error: `${name} must be base64 encoded` };
  }
  // IV is 12 bytes = 16 chars base64 (with padding), Keys are 32 bytes = 44 chars base64
  const minLength = name === "IV" ? 15 : 32;
  const maxLength = name === "IV" ? 17 : 100;
  if (key.length < minLength || key.length > maxLength) {
    return { valid: false, error: `${name} has invalid length` };
  }
  return { valid: true };
}

export function validateTimestamp(timestamp: number): ValidationResult {
  if (!Number.isInteger(timestamp) || timestamp < 0) {
    return { valid: false, error: "Invalid timestamp" };
  }
  if (!Number.isSafeInteger(timestamp)) {
    return { valid: false, error: "Timestamp exceeds safe integer range" };
  }
  
  // Safe calculation: check if addition would overflow
  const maxYears = 100;
  const msPerYear = 365 * 24 * 60 * 60 * 1000;
  const maxOffset = maxYears * msPerYear;
  
  if (timestamp > Number.MAX_SAFE_INTEGER - maxOffset) {
    return { valid: false, error: "Timestamp too far in future" };
  }
  
  const now = Date.now();
  const maxFuture = now + maxOffset;
  
  if (timestamp > maxFuture) {
    return { valid: false, error: "Timestamp too far in future" };
  }
  return { valid: true };
}

export function validateSealAge(createdAt: number): ValidationResult {
  const MAX_SEAL_AGE = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years
  if (Date.now() - createdAt > MAX_SEAL_AGE) {
    return { valid: false, error: "Seal expired (max 2 years)" };
  }
  return { valid: true };
}

export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE_BEFORE_ENCRYPTION) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${Math.floor(MAX_FILE_SIZE_BEFORE_ENCRYPTION / 1024)}KB (before encryption)`,
    };
  }
  return { valid: true };
}

export function validateUnlockTime(unlockTime: number): ValidationResult {
  const now = Date.now();

  if (unlockTime <= now + MIN_UNLOCK_DELAY) {
    return {
      valid: false,
      error: "Unlock time must be at least 1 minute in the future",
    };
  }

  const maxUnlockTime = now + MAX_DURATION_DAYS * 24 * 60 * 60 * 1000;
  if (unlockTime > maxUnlockTime) {
    return {
      valid: false,
      error: `Unlock time cannot exceed ${MAX_DURATION_DAYS} days`,
    };
  }

  return { valid: true };
}

export function validatePulseInterval(interval: number): ValidationResult {
  if (!Number.isFinite(interval) || isNaN(interval)) {
    return { valid: false, error: "Pulse interval must be a valid number" };
  }

  if (interval < MIN_PULSE_INTERVAL) {
    return { valid: false, error: "Pulse interval must be at least 5 minutes" };
  }

  if (interval > MAX_PULSE_INTERVAL) {
    return { valid: false, error: "Pulse interval cannot exceed 30 days" };
  }

  return { valid: true };
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "").trim();
}
