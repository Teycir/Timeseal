import { describe, it, expect, beforeEach } from '@jest/globals';
import { encryptData, decryptData } from '../../lib/crypto';
import { MockDatabase } from '../../lib/database';
import { MockStorage } from '../../lib/storage';
import { SealService } from '../../lib/sealService';

describe('Integration Tests - End-to-End Flows', () => {
  let db: MockDatabase;
  let storage: MockStorage;
  let sealService: SealService;

  beforeEach(() => {
    db = new MockDatabase();
    storage = new MockStorage();
    sealService = new SealService(storage, db);
  });

  describe('Complete Timed Release Flow', () => {
    it('should encrypt, seal, lock, unlock, and decrypt message', async () => {
      const originalMessage = 'This is a secret message for the future';
      const unlockTime = Date.now() + 61000;

      // Step 1: Client-side encryption
      const encrypted = await encryptData(originalMessage);
      expect(encrypted.keyA).toBeDefined();
      expect(encrypted.keyB).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.encryptedBlob.byteLength).toBeGreaterThan(0);

      // Step 2: Create seal on server
      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: false,
      }, '192.168.1.1');

      expect(sealResult.sealId).toBeDefined();
      expect(sealResult.sealId.length).toBe(32);
      expect(sealResult.iv).toBe(encrypted.iv);
      expect(sealResult.pulseToken).toBeUndefined();

      // Manually unlock for testing
      await db.updateUnlockTime(sealResult.sealId, Date.now() - 1000);

      // Step 3: Verify seal metadata (unlocked)
      const metadata = await sealService.getSeal(sealResult.sealId, '192.168.1.1');
      expect(metadata.id).toBe(sealResult.sealId);
      expect(metadata.status).toBe('unlocked');
      expect(metadata.isDMS).toBe(false);
      expect(metadata.keyB).toBeDefined();
      expect(metadata.iv).toBeDefined();

      // Step 4: Retrieve encrypted blob
      const retrievedBlob = await sealService.getBlob(sealResult.sealId);
      expect(retrievedBlob.byteLength).toBe(encrypted.encryptedBlob.byteLength);

      // Step 5: Client-side decryption with both keys
      const decrypted = await decryptData(retrievedBlob, {
        keyA: encrypted.keyA,
        keyB: metadata.keyB!,
        iv: metadata.iv!,
      });

      const decryptedMessage = new TextDecoder().decode(decrypted);
      expect(decryptedMessage).toBe(originalMessage);
    });

    it('should prevent access to locked seal', async () => {
      const message = 'Future secret';
      const unlockTime = Date.now() + 3600000; // 1 hour in future

      const encrypted = await encryptData(message);
      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: false,
      }, '192.168.1.1');

      // Verify seal is locked
      const metadata = await sealService.getSeal(sealResult.sealId, '192.168.1.1');
      expect(metadata.status).toBe('locked');
      expect(metadata.keyB).toBeUndefined(); // Server withholds keyB
      expect(metadata.iv).toBeUndefined();
      expect(metadata.unlockTime).toBe(unlockTime);
    });
  });

  describe('Complete Dead Man\'s Switch Flow', () => {
    it('should create DMS, pulse to extend, and track expiry', async () => {
      const emergencyMessage = 'If you see this, I need help';
      const pulseInterval = 86400; // 1 day in seconds
      const unlockTime = Date.now() + pulseInterval * 1000;

      // Step 1: Encrypt message
      const encrypted = await encryptData(emergencyMessage);

      // Step 2: Create DMS seal
      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: true,
        pulseInterval,
      }, '192.168.1.1');

      expect(sealResult.pulseToken).toBeDefined();
      expect(sealResult.pulseToken!.split(':').length).toBe(4); // sealId:timestamp:nonce:signature

      // Step 3: Verify DMS seal is locked
      const metadata = await sealService.getSeal(sealResult.sealId, '192.168.1.1');
      expect(metadata.isDMS).toBe(true);
      expect(metadata.status).toBe('locked');

      // Step 4: Send pulse to extend unlock time
      const pulseResult = await sealService.pulseSeal(sealResult.pulseToken!, '192.168.1.1');
      expect(pulseResult.newUnlockTime).toBeGreaterThan(Date.now());
      expect(pulseResult.newUnlockTime).toBeGreaterThan(unlockTime);

      // Step 5: Verify unlock time was extended
      const updatedMetadata = await sealService.getSeal(sealResult.sealId, '192.168.1.1');
      expect(updatedMetadata.unlockTime).toBe(pulseResult.newUnlockTime);

      // Step 6: Verify pulse updated in database
      const dbSeal = await db.getSeal(sealResult.sealId);
      expect(dbSeal?.lastPulse).toBeDefined();
      expect(dbSeal?.lastPulse).toBeGreaterThan(Date.now() - 1000);
    });

    it('should detect expired DMS seals', async () => {
      const message = 'Expired DMS';
      const pulseInterval = 3600;
      const unlockTime = Date.now() + 61000;

      const encrypted = await encryptData(message);
      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: true,
        pulseInterval,
      }, '192.168.1.1');

      // Manually set to expired
      await db.updateUnlockTime(sealResult.sealId, Date.now() - 2000);
      await db.updatePulse(sealResult.sealId, Date.now() - 7200000); // 2 hours ago

      // Check for expired seals
      const expired = await db.getExpiredDMS();
      expect(expired.length).toBeGreaterThan(0);
    });
  });

  describe('File Upload and Encryption Flow', () => {
    it('should handle binary file encryption end-to-end', async () => {
      // Create test file with binary data
      const fileData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]); // JPEG header
      const file = new File([fileData], 'photo.jpg', { type: 'image/jpeg' });
      const unlockTime = Date.now() + 61000;

      // Encrypt file
      const encrypted = await encryptData(file);
      expect(encrypted.encryptedBlob.byteLength).toBeGreaterThan(fileData.length);

      // Create seal
      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: false,
      }, '192.168.1.1');

      // Manually unlock for testing
      await db.updateUnlockTime(sealResult.sealId, Date.now() - 1000);

      // Retrieve and decrypt
      const metadata = await sealService.getSeal(sealResult.sealId, '192.168.1.1');
      const blob = await sealService.getBlob(sealResult.sealId);
      const decrypted = await decryptData(blob, {
        keyA: encrypted.keyA,
        keyB: metadata.keyB!,
        iv: metadata.iv!,
      });

      // Verify file integrity
      const decryptedData = new Uint8Array(decrypted);
      expect(decryptedData).toEqual(fileData);
    });
  });

  describe('Security and Error Scenarios', () => {
    it('should reject decryption with wrong keyA', async () => {
      const message = 'Secret';
      const encrypted = await encryptData(message);
      const unlockTime = Date.now() + 61000;

      await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: false,
      }, '192.168.1.1');

      // Generate wrong keyA
      const wrongEncrypted = await encryptData('different');
      
      await expect(
        decryptData(encrypted.encryptedBlob, {
          keyA: wrongEncrypted.keyA, // Wrong key
          keyB: encrypted.keyB,
          iv: encrypted.iv,
        })
      ).rejects.toThrow();
    });

    it('should detect HMAC tampering', async () => {
      const message = 'Original';
      const encrypted = await encryptData(message);

      // Tamper with encrypted data
      const tampered = new Uint8Array(encrypted.encryptedBlob);
      tampered[10] ^= 0xFF;

      await expect(
        decryptData(tampered.buffer, {
          keyA: encrypted.keyA,
          keyB: encrypted.keyB,
          iv: encrypted.iv,
        })
      ).rejects.toThrow();
    });

    it('should reject access to non-existent seal', async () => {
      await expect(
        sealService.getSeal('non-existent-seal-id', '192.168.1.1')
      ).rejects.toThrow('SEAL_NOT_FOUND');
    });

    it('should reject invalid pulse token format', async () => {
      await expect(
        sealService.pulseSeal('invalid-token', '192.168.1.1')
      ).rejects.toThrow();
    });

    it('should reject pulse for non-DMS seal', async () => {
      const message = 'Regular seal';
      const encrypted = await encryptData(message);
      
      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime: Date.now() + 100000,
        isDMS: false, // Not a DMS
      }, '192.168.1.1');

      // Try to pulse non-DMS seal
      const fakePulseToken = `${sealResult.sealId}:${Date.now()}:nonce:sig`;
      await expect(
        sealService.pulseSeal(fakePulseToken, '192.168.1.1')
      ).rejects.toThrow();
    });
  });

  describe('Multiple Concurrent Seals', () => {
    it('should handle multiple independent seals correctly', async () => {
      const messages = ['Secret 1', 'Secret 2', 'Secret 3'];
      const seals = [];

      // Create multiple seals
      for (const msg of messages) {
        const encrypted = await encryptData(msg);
        const result = await sealService.createSeal({
          encryptedBlob: encrypted.encryptedBlob,
          keyB: encrypted.keyB,
          iv: encrypted.iv,
          unlockTime: Date.now() + 61000,
          isDMS: false,
        }, '192.168.1.1');

        // Manually unlock for testing
        await db.updateUnlockTime(result.sealId, Date.now() - 1000);

        seals.push({ encrypted, result, original: msg });
      }

      // Verify all seals are independent
      const sealIds = seals.map(s => s.result.sealId);
      expect(new Set(sealIds).size).toBe(3); // All unique

      // Decrypt each seal independently
      for (const seal of seals) {
        const metadata = await sealService.getSeal(seal.result.sealId, '192.168.1.1');
        const blob = await sealService.getBlob(seal.result.sealId);
        const decrypted = await decryptData(blob, {
          keyA: seal.encrypted.keyA,
          keyB: metadata.keyB!,
          iv: metadata.iv!,
        });

        const message = new TextDecoder().decode(decrypted);
        expect(message).toBe(seal.original);
      }
    });

    it('should isolate DMS and regular seals', async () => {
      const regularMsg = 'Regular seal';
      const dmsMsg = 'DMS seal';

      const regularEncrypted = await encryptData(regularMsg);
      const dmsEncrypted = await encryptData(dmsMsg);

      const regularSeal = await sealService.createSeal({
        encryptedBlob: regularEncrypted.encryptedBlob,
        keyB: regularEncrypted.keyB,
        iv: regularEncrypted.iv,
        unlockTime: Date.now() + 100000,
        isDMS: false,
      }, '192.168.1.1');

      const dmsSeal = await sealService.createSeal({
        encryptedBlob: dmsEncrypted.encryptedBlob,
        keyB: dmsEncrypted.keyB,
        iv: dmsEncrypted.iv,
        unlockTime: Date.now() + 100000,
        isDMS: true,
        pulseInterval: 86400,
      }, '192.168.1.1');

      const regularMetadata = await sealService.getSeal(regularSeal.sealId, '192.168.1.1');
      const dmsMetadata = await sealService.getSeal(dmsSeal.sealId, '192.168.1.1');

      expect(regularMetadata.isDMS).toBe(false);
      expect(dmsMetadata.isDMS).toBe(true);
      expect(regularSeal.pulseToken).toBeUndefined();
      expect(dmsSeal.pulseToken).toBeDefined();
    });
  });

  describe('Storage and Database Integration', () => {
    it('should persist seal data correctly', async () => {
      const message = 'Persistent data';
      const encrypted = await encryptData(message);
      const unlockTime = Date.now() + 100000;

      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        isDMS: false,
      }, '192.168.1.1');

      // Verify database record
      const dbRecord = await db.getSeal(sealResult.sealId);
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.id).toBe(sealResult.sealId);
      expect(dbRecord?.unlockTime).toBe(unlockTime);
      expect(dbRecord?.isDMS).toBe(false);
      expect(dbRecord?.keyB).toBeDefined(); // Encrypted keyB
      expect(dbRecord?.iv).toBe(encrypted.iv);

      // Verify storage blob
      const storedBlob = await storage.downloadBlob(sealResult.sealId);
      expect(new Uint8Array(storedBlob)).toEqual(new Uint8Array(encrypted.encryptedBlob));
    });

    it('should handle pulse updates in database', async () => {
      const message = 'DMS test';
      const encrypted = await encryptData(message);
      const pulseInterval = 86400;

      const sealResult = await sealService.createSeal({
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime: Date.now() + pulseInterval * 1000,
        isDMS: true,
        pulseInterval,
      }, '192.168.1.1');

      const beforePulse = await db.getSeal(sealResult.sealId);
      const initialLastPulse = beforePulse?.lastPulse;

      await new Promise(resolve => setTimeout(resolve, 10));
      await sealService.pulseSeal(sealResult.pulseToken!, '192.168.1.1');

      const afterPulse = await db.getSeal(sealResult.sealId);
      expect(afterPulse?.lastPulse).toBeGreaterThan(initialLastPulse!);
    });
  });
});
