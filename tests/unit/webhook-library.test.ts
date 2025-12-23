import { describe, it, expect } from '@jest/globals';
import {
  encryptWebhook,
  decryptWebhook,
  validateWebhookUrl,
  fireWebhook,
  decryptAndFireWebhook,
} from '@/lib/reusable/webhook';
import { base64ToArrayBuffer } from '@/lib/cryptoUtils';

describe('Reusable Webhook Library', () => {
  const generateTestKey = async (): Promise<CryptoKey> => {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
  };

  describe('encryptWebhook', () => {
    it('encrypts webhook URL', async () => {
      const key = await generateTestKey();
      const url = 'https://hooks.zapier.com/test';
      const encrypted = await encryptWebhook(url, key);

      expect(encrypted).toContain(':');
      expect(encrypted).not.toContain(url);
    });

    it('produces different ciphertexts for same URL', async () => {
      const key = await generateTestKey();
      const url = 'https://example.com/hook';
      const encrypted1 = await encryptWebhook(url, key);
      const encrypted2 = await encryptWebhook(url, key);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });
  });

  describe('decryptWebhook', () => {
    it('decrypts webhook URL', async () => {
      const key = await generateTestKey();
      const url = 'https://discord.com/api/webhooks/test';
      const encrypted = await encryptWebhook(url, key);
      const decrypted = await decryptWebhook(encrypted, key);

      expect(decrypted).toBe(url);
    });

    it('throws on wrong key', async () => {
      const key1 = await generateTestKey();
      const key2 = await generateTestKey();
      const url = 'https://example.com/hook';
      const encrypted = await encryptWebhook(url, key1);

      await expect(decryptWebhook(encrypted, key2)).rejects.toThrow();
    });

    it('throws on malformed encrypted data', async () => {
      const key = await generateTestKey();
      await expect(decryptWebhook('invalid:data', key)).rejects.toThrow();
    });
  });

  describe('validateWebhookUrl', () => {
    it('accepts HTTPS URLs', () => {
      expect(validateWebhookUrl('https://example.com/webhook')).toBe(true);
      expect(validateWebhookUrl('https://hooks.zapier.com/test')).toBe(true);
    });

    it('rejects HTTP URLs', () => {
      expect(validateWebhookUrl('http://insecure.com/webhook')).toBe(false);
    });

    it('rejects invalid URLs', () => {
      expect(validateWebhookUrl('not-a-url')).toBe(false);
      expect(validateWebhookUrl('')).toBe(false);
      expect(validateWebhookUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('fireWebhook', () => {
    it('fires webhook with payload', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch as any;

      await fireWebhook('https://example.com/hook', {
        event: 'test',
        data: 'value',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/hook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event: 'test', data: 'value' }),
        }),
      );
    });

    it('rejects HTTP URLs silently', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch as any;

      await fireWebhook('http://insecure.com/hook', { event: 'test' });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles fetch errors silently', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fireWebhook('https://example.com/hook', { event: 'test' }),
      ).resolves.toBeUndefined();
    });

    it('respects timeout', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch as any;

      await fireWebhook('https://example.com/hook', { event: 'test' }, 3000);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  describe('decryptAndFireWebhook', () => {
    it('decrypts and fires webhook', async () => {
      const key = await generateTestKey();
      const url = 'https://example.com/hook';
      const encrypted = await encryptWebhook(url, key);
      const keyB = await crypto.subtle.exportKey('raw', key);
      const keyBBase64 = btoa(String.fromCharCode(...new Uint8Array(keyB)));

      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch as any;

      await decryptAndFireWebhook(encrypted, keyBBase64, {
        event: 'seal_unlocked',
        sealId: 'test123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ event: 'seal_unlocked', sealId: 'test123' }),
        }),
      );
    });

    it('handles decryption errors silently', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch as any;

      await expect(
        decryptAndFireWebhook('invalid:data', 'invalidkey', { event: 'test' }),
      ).resolves.toBeUndefined();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
