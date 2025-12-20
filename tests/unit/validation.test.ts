import { describe, it, expect } from '@jest/globals';
import {
  validateFileSize,
  validateUnlockTime,
  validatePulseInterval,
  sanitizeInput,
} from '../../lib/validation';

describe('Validation', () => {
  describe('validateFileSize', () => {
    it('should accept valid file size', () => {
      const result = validateFileSize(1024 * 1024); // 1MB
      expect(result.valid).toBe(true);
    });

    it('should reject oversized file', () => {
      const result = validateFileSize(200 * 1024 * 1024); // 200MB
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('validateUnlockTime', () => {
    it('should accept future time', () => {
      const futureTime = Date.now() + 3600000; // 1 hour
      const result = validateUnlockTime(futureTime);
      expect(result.valid).toBe(true);
    });

    it('should reject past time', () => {
      const pastTime = Date.now() - 1000;
      const result = validateUnlockTime(pastTime);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 1 minute in the future');
    });

    it('should reject time too far in future', () => {
      const farFuture = Date.now() + 400 * 24 * 60 * 60 * 1000; // 400 days
      const result = validateUnlockTime(farFuture);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed');
    });
  });

  describe('validatePulseInterval', () => {
    it('should accept valid interval', () => {
      const result = validatePulseInterval(86400); // 1 day
      expect(result.valid).toBe(true);
    });

    it('should reject too short interval', () => {
      const result = validatePulseInterval(1800); // 30 minutes
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 1 hour');
    });

    it('should reject too long interval', () => {
      const result = validatePulseInterval(100 * 24 * 3600); // 100 days
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 90 days');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should trim whitespace', () => {
      const result = sanitizeInput('  test  ');
      expect(result).toBe('test');
    });
  });
});
