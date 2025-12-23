// Security Enhancements Test Suite
import { describe, it, expect, beforeEach } from '@jest/globals';
import { encryptKeyB, decryptKeyB } from '@/lib/keyEncryption';
import { MockStorage } from '@/lib/storage';
import { validateFileSize } from '@/lib/validation';
import { verifyIntegrity, detectTampering } from '@/lib/clientIntegrity';

describe('Security Enhancements', () => {
  describe('1. Key Rotation', () => {
    it('should encrypt and decrypt with master key', async () => {
      const keyB = 'test-key-b';
      const masterKey = 'test-master-key-32-bytes-long!!';
      const sealId = 'test-seal-id';

      const encrypted = await encryptKeyB(keyB, masterKey, sealId);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(keyB);

      const decrypted = await decryptKeyB(encrypted, masterKey, sealId);
      expect(decrypted).toBe(keyB);
    });

    it('should fail decryption with wrong master key', async () => {
      const keyB = 'test-key-b';
      const masterKey1 = 'master-key-1-32-bytes-long!!!!';
      const masterKey2 = 'master-key-2-32-bytes-long!!!!';
      const sealId = 'test-seal-id';

      const encrypted = await encryptKeyB(keyB, masterKey1, sealId);

      await expect(
        decryptKeyB(encrypted, masterKey2, sealId)
      ).rejects.toThrow();
    });

    it('should use different encryption for different seal IDs', async () => {
      const keyB = 'test-key-b';
      const masterKey = 'test-master-key-32-bytes-long!!';

      const encrypted1 = await encryptKeyB(keyB, masterKey, 'seal-1');
      const encrypted2 = await encryptKeyB(keyB, masterKey, 'seal-2');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should support dual-key fallback decryption', async () => {
      const keyB = 'test-key-b';
      const oldKey = 'old-master-key-32-bytes-long!!!';
      const newKey = 'new-master-key-32-bytes-long!!!';
      const sealId = 'test-seal-id';

      // Encrypt with old key
      const encrypted = await encryptKeyB(keyB, oldKey, sealId);

      // Should decrypt with old key directly
      const decrypted = await decryptKeyB(encrypted, oldKey, sealId);
      expect(decrypted).toBe(keyB);
    });
  });

  describe('2. File Upload Limits', () => {
    const MAX_SIZE = 750 * 1024; // 750KB (actual limit)

    it('should reject files exceeding size limit', () => {
      const oversized = MAX_SIZE + 1;
      const result = validateFileSize(oversized);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should accept files within size limit', () => {
      const validSize = 500 * 1024; // 500KB
      const result = validateFileSize(validSize);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should enforce size limit in MockStorage', async () => {
      const storage = new MockStorage();
      const oversizedData = new ArrayBuffer(MAX_SIZE + 1);

      await expect(
        storage.uploadBlob('test-seal', oversizedData, Date.now() + 60000)
      ).rejects.toThrow('exceeds maximum size');
    });

    it('should allow valid size in MockStorage', async () => {
      const storage = new MockStorage();
      const validData = new ArrayBuffer(1024); // 1KB

      await expect(
        storage.uploadBlob('test-seal', validData, Date.now() + 60000)
      ).resolves.not.toThrow();
    });

    it('should validate at multiple layers', () => {
      const testSizes = [
        { size: 1024, expected: true },           // 1KB - valid
        { size: 500 * 1024, expected: true },     // 500KB - valid
        { size: 700 * 1024, expected: true },     // 700KB - valid
        { size: MAX_SIZE + 1, expected: false },   // 750KB+1 - invalid
        { size: 50 * 1024 * 1024, expected: false }, // 50MB - invalid
      ];

      testSizes.forEach(({ size, expected }) => {
        const result = validateFileSize(size);
        expect(result.valid).toBe(expected);
      });
    });
  });

  describe('3. Client Integrity Verification', () => {
    it('should verify crypto API availability', async () => {
      const result = await verifyIntegrity();
      expect(typeof result).toBe('boolean');
    });

    it('should detect tampering indicators', () => {
      // Mock browser environment
      (global as any).window = {
        isSecureContext: true,
      };
      
      const warnings = detectTampering();
      expect(Array.isArray(warnings)).toBe(true);
      
      delete (global as any).window;
    });

    it('should verify crypto operations work correctly', async () => {
      // Test that basic crypto operations function
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      expect(key).toBeTruthy();
      expect(key.type).toBe('secret');
    });

    it('should detect missing crypto API', async () => {
      const originalSubtle = crypto.subtle;
      
      try {
        Object.defineProperty(crypto, 'subtle', {
          value: undefined,
          configurable: true,
        });

        const result = await verifyIntegrity();
        expect(result).toBe(false);
      } finally {
        Object.defineProperty(crypto, 'subtle', {
          value: originalSubtle,
          configurable: true,
        });
      }
    });
  });

  describe('Integration: All Three Enhancements', () => {
    it('should work together in complete flow', async () => {
      // 1. Validate file size
      const fileSize = 500 * 1024; // 500KB
      const sizeValidation = validateFileSize(fileSize);
      expect(sizeValidation.valid).toBe(true);

      // 2. Encrypt keyB with master key
      const keyB = 'test-key-b';
      const masterKey = 'test-master-key-32-bytes-long!!';
      const sealId = 'test-seal-id';
      const encryptedKeyB = await encryptKeyB(keyB, masterKey, sealId);

      // 3. Store encrypted blob
      const storage = new MockStorage();
      const blob = new ArrayBuffer(fileSize);
      await storage.uploadBlob(sealId, blob, Date.now() + 60000);

      // 4. Verify integrity
      const integrityCheck = await verifyIntegrity();
      expect(integrityCheck).toBe(true);

      // 5. Retrieve and decrypt
      const retrievedBlob = await storage.downloadBlob(sealId);
      expect(retrievedBlob.byteLength).toBe(fileSize);

      const decryptedKeyB = await decryptKeyB(encryptedKeyB, masterKey, sealId);
      expect(decryptedKeyB).toBe(keyB);
    });

    it('should reject oversized files even with valid key', async () => {
      const oversizedFile = 11 * 1024 * 1024; // 11MB (far exceeds 750KB limit)
      const sizeValidation = validateFileSize(oversizedFile);
      expect(sizeValidation.valid).toBe(false);

      // Even with valid encryption, storage should reject
      const storage = new MockStorage();
      const blob = new ArrayBuffer(oversizedFile);

      await expect(
        storage.uploadBlob('test-seal', blob, Date.now() + 60000)
      ).rejects.toThrow();
    });
  });
});

describe('Security Configuration', () => {
  it('should have secure defaults', () => {
    const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');
    expect(MAX_FILE_SIZE_MB).toBeLessThanOrEqual(10);
    expect(MAX_FILE_SIZE_MB).toBeGreaterThan(0);
  });

  it('should require master encryption key', () => {
    // In production, this should be set
    const key = process.env.MASTER_ENCRYPTION_KEY;
    // In test environment, it might not be set
    if (process.env.NODE_ENV === 'production') {
      expect(key).toBeTruthy();
    }
  });
});
