// Input Validation
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;
const MAX_DURATION_DAYS = parseInt(process.env.MAX_SEAL_DURATION_DAYS || '365');
const MIN_UNLOCK_DELAY = 60 * 1000; // 1 minute

export function validateFileSize(size: number): ValidationResult {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

export function validateUnlockTime(unlockTime: number): ValidationResult {
  const now = Date.now();
  
  if (unlockTime <= now + MIN_UNLOCK_DELAY) {
    return {
      valid: false,
      error: 'Unlock time must be at least 1 minute in the future',
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
  const minInterval = 3600; // 1 hour
  const maxInterval = 90 * 24 * 3600; // 90 days
  
  if (interval < minInterval) {
    return { valid: false, error: 'Pulse interval must be at least 1 hour' };
  }
  
  if (interval > maxInterval) {
    return { valid: false, error: 'Pulse interval cannot exceed 90 days' };
  }
  
  return { valid: true };
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}
