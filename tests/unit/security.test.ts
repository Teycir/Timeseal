import { describe, it, expect } from '@jest/globals';
import {
  constantTimeEqual,
  generatePulseToken,
  validatePulseToken,
  sanitizeError,
  validateCSRF,
  validateContentType,
  checkAndStoreNonce,
} from '../../lib/security';

describe('Security Utilities', () => {
  const testSecret = 'test-secret-key-12345';

  describe('constantTimeEqual', () => {
    it('should return true for identical strings', () => {
      expect(constantTimeEqual('abc123', 'abc123')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(constantTimeEqual('abc123', 'abc124')).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    });
  });

  describe('generatePulseToken', () => {
    it('should generate valid pulse token', async () => {
      const token = await generatePulseToken('seal-123', testSecret);
      expect(token).toBeDefined();
      expect(token.split(':').length).toBe(4);
    });

    it('should generate unique tokens', async () => {
      const token1 = await generatePulseToken('seal-123', testSecret);
      const token2 = await generatePulseToken('seal-123', testSecret);
      expect(token1).not.toBe(token2);
    });
  });

  describe('validatePulseToken', () => {
    it('should validate correct token', async () => {
      const token = await generatePulseToken('seal-123', testSecret);
      const isValid = await validatePulseToken(token, 'seal-123', testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject token with wrong seal ID', async () => {
      const token = await generatePulseToken('seal-123', testSecret);
      const isValid = await validatePulseToken(token, 'seal-456', testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject malformed token', async () => {
      const isValid = await validatePulseToken('invalid', 'seal-123', testSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('sanitizeError', () => {
    it('should return generic message in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const result = sanitizeError(new Error('Internal details'));
      expect(result).toBe('An error occurred. Please try again.');
      process.env.NODE_ENV = originalEnv;
    });

    it('should return error message in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const result = sanitizeError(new Error('Debug info'));
      expect(result).toBe('Debug info');
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('validateCSRF', () => {
    it('should accept valid origin', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: { origin: 'http://localhost:3000' },
      });
      expect(validateCSRF(request)).toBe(true);
    });

    it('should reject invalid origin', () => {
      const request = new Request('http://localhost:3000/api/test', {
        headers: { origin: 'http://evil.com' },
      });
      expect(validateCSRF(request)).toBe(false);
    });
  });

  describe('validateContentType', () => {
    it('should accept allowed types', () => {
      expect(validateContentType('text/plain')).toBe(true);
      expect(validateContentType('application/pdf')).toBe(true);
      expect(validateContentType('image/png')).toBe(true);
    });

    it('should reject disallowed types', () => {
      expect(validateContentType('application/x-executable')).toBe(false);
      expect(validateContentType('text/html')).toBe(false);
    });
  });

  describe('checkAndStoreNonce', () => {
    it('should accept new nonce', () => {
      const nonce = crypto.randomUUID();
      expect(checkAndStoreNonce(nonce)).toBe(true);
    });

    it('should reject duplicate nonce', () => {
      const nonce = crypto.randomUUID();
      checkAndStoreNonce(nonce);
      expect(checkAndStoreNonce(nonce)).toBe(false);
    });
  });
});
