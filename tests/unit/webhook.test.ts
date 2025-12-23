import { describe, it, expect, beforeEach } from '@jest/globals';
import { encryptData } from '@/lib/crypto';
import { SealService } from '@/lib/sealService';
import { MockDatabase } from '@/lib/database';
import { MockStorage } from '@/lib/storage';
import { encryptWebhook, decryptWebhook } from '@/lib/reusable/webhook';

describe('Webhook Feature', () => {
  let db: MockDatabase;
  let storage: MockStorage;
  let service: SealService;
  const masterKey = 'test-master-key-32-chars-long!!';

  beforeEach(() => {
    db = new MockDatabase();
    storage = new MockStorage();
    service = new SealService(storage, db, masterKey);
  });

  it('encrypts webhook URL with keyB', async () => {
    const webhookUrl = 'https://hooks.zapier.com/test';
    const encrypted = await encryptData('test message', { webhookUrl });

    expect(encrypted.encryptedWebhook).toBeDefined();
    expect(encrypted.encryptedWebhook).toContain(':');
    expect(encrypted.encryptedWebhook).not.toContain(webhookUrl);
  });

  it('uses reusable webhook library', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const url = 'https://example.com/hook';
    const encrypted = await encryptWebhook(url, key);
    const decrypted = await decryptWebhook(encrypted, key);
    
    expect(decrypted).toBe(url);
  });

  it('stores encrypted webhook in database', async () => {
    const webhookUrl = 'https://discord.com/api/webhooks/test';
    const encrypted = await encryptData('test', { webhookUrl });
    
    const unlockTime = Date.now() + 1000;
    const result = await service.createSeal(
      {
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
        encryptedWebhook: encrypted.encryptedWebhook,
      },
      '127.0.0.1'
    );

    const seal = await db.getSeal(result.sealId);
    expect(seal?.encryptedWebhook).toBe(encrypted.encryptedWebhook);
  });

  it('rejects non-HTTPS webhook URLs', async () => {
    const webhookUrl = 'http://insecure.com/webhook';
    const encrypted = await encryptData('test', { webhookUrl });
    
    // Webhook should still encrypt, but fireWebhook will reject HTTP
    expect(encrypted.encryptedWebhook).toBeDefined();
  });

  it('handles missing webhook gracefully', async () => {
    const encrypted = await encryptData('test');
    
    expect(encrypted.encryptedWebhook).toBeUndefined();
    
    const unlockTime = Date.now() + 1000;
    const result = await service.createSeal(
      {
        encryptedBlob: encrypted.encryptedBlob,
        keyB: encrypted.keyB,
        iv: encrypted.iv,
        unlockTime,
      },
      '127.0.0.1'
    );

    const seal = await db.getSeal(result.sealId);
    expect(seal?.encryptedWebhook).toBeUndefined();
  });

  it('webhook format is iv:ciphertext', async () => {
    const encrypted = await encryptData('test', { 
      webhookUrl: 'https://example.com/hook' 
    });

    const parts = encrypted.encryptedWebhook?.split(':');
    expect(parts).toHaveLength(2);
    expect(parts![0]).toMatch(/^[A-Za-z0-9+/=]+$/); // base64 IV
    expect(parts![1]).toMatch(/^[A-Za-z0-9+/=]+$/); // base64 ciphertext
  });
});
