// Reusable Webhook Library - Encrypted webhook notifications
import { arrayBufferToBase64, base64ToArrayBuffer } from '../cryptoUtils';

export interface WebhookPayload {
  event: string;
  [key: string]: any;
}

export interface EncryptedWebhook {
  iv: string;
  ciphertext: string;
}

/**
 * Encrypt webhook URL with AES-GCM key
 */
export async function encryptWebhook(
  webhookUrl: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(webhookUrl);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encrypted)}`;
}

/**
 * Decrypt webhook URL with AES-GCM key
 */
export async function decryptWebhook(
  encryptedWebhook: string,
  key: CryptoKey,
): Promise<string> {
  const [ivB64, cipherB64] = encryptedWebhook.split(':');
  const iv = base64ToArrayBuffer(ivB64);
  const cipher = base64ToArrayBuffer(cipherB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher,
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Validate webhook URL (HTTPS only)
 */
export function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fire webhook with payload (fire-and-forget)
 */
export async function fireWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  timeoutMs: number = 5000,
): Promise<void> {
  if (!validateWebhookUrl(webhookUrl)) return;
  
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {}
}

/**
 * Decrypt and fire webhook (convenience function)
 */
export async function decryptAndFireWebhook(
  encryptedWebhook: string,
  keyB: string,
  payload: WebhookPayload,
): Promise<void> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      base64ToArrayBuffer(keyB),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
    const webhookUrl = await decryptWebhook(encryptedWebhook, key);
    await fireWebhook(webhookUrl, payload);
  } catch {}
}
