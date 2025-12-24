// Encrypted localStorage for seals
import { arrayBufferToBase64, base64ToArrayBuffer } from './cryptoUtils';

interface StoredSeal {
  id: string;
  publicUrl: string;
  pulseUrl?: string;
  pulseToken?: string;
  type: 'timed' | 'deadman' | 'ephemeral';
  unlockTime: number;
  createdAt: number;
  maxViews?: number;
}

const STORAGE_KEY = 'timeseal_links';
const ENCRYPTION_KEY_NAME = 'timeseal_storage_key';

// Generate or retrieve encryption key for localStorage
async function getStorageKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (stored) {
    const keyData = base64ToArrayBuffer(stored);
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, arrayBufferToBase64(exported));
  
  return key;
}

// Encrypt data
async function encryptStorage(data: string): Promise<string> {
  const key = await getStorageKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return arrayBufferToBase64(combined.buffer);
}

// Decrypt data
async function decryptStorage(encrypted: string): Promise<string> {
  const key = await getStorageKey();
  const combined = base64ToArrayBuffer(encrypted);
  
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

// Save seals (encrypted)
export async function saveSeals(seals: StoredSeal[]): Promise<void> {
  const json = JSON.stringify(seals);
  const encrypted = await encryptStorage(json);
  localStorage.setItem(STORAGE_KEY, encrypted);
}

// Load seals (decrypted, sorted by most recent first)
export async function loadSeals(): Promise<StoredSeal[]> {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return [];
  
  try {
    const decrypted = await decryptStorage(encrypted);
    const seals = JSON.parse(decrypted) as StoredSeal[];
    return seals.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to decrypt seals:', error);
    return [];
  }
}

// Add seal
export async function addSeal(seal: StoredSeal): Promise<void> {
  const seals = await loadSeals();
  seals.push(seal);
  await saveSeals(seals);
}

// Remove seal
export async function removeSeal(sealId: string): Promise<void> {
  const seals = await loadSeals();
  const filtered = seals.filter(s => s.id !== sealId);
  await saveSeals(filtered);
}
