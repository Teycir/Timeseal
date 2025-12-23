// Time-Seal Crypto Library - Split-Key AES-GCM Encryption
import { SecureMemory } from './memoryProtection';
import { arrayBufferToBase64, base64ToArrayBuffer } from './cryptoUtils';
import { generateSeedPhrase } from './seedPhrase';

export interface EncryptionResult {
  encryptedBlob: ArrayBuffer;
  keyA: string;
  keyB: string;
  iv: string;
  seedPhrase?: string;
}

export interface DecryptionKeys {
  keyA: string;
  keyB: string;
  iv: string;
}

// Generate two random AES-256 keys
export async function generateKeys(): Promise<{ keyA: CryptoKey; keyB: CryptoKey }> {
  // Generate keys in parallel for better performance
  const [keyA, keyB] = await Promise.all([
    crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ),
    crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  ]);

  return { keyA, keyB };
}

// Derive master key from Key A + Key B using HKDF
async function deriveMasterKey(keyA: CryptoKey, keyB: CryptoKey): Promise<CryptoKey> {
  const keyABuffer = await crypto.subtle.exportKey('raw', keyA);
  const keyBBuffer = await crypto.subtle.exportKey('raw', keyB);
  
  // Concatenate keys for HKDF input
  const combinedKey = new Uint8Array(64);
  combinedKey.set(new Uint8Array(keyABuffer), 0);
  combinedKey.set(new Uint8Array(keyBBuffer), 32);

  // Zero exported key buffers after copying
  new Uint8Array(keyABuffer).fill(0);
  new Uint8Array(keyBBuffer).fill(0);

  // Import combined key for HKDF
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    combinedKey,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Zero combined key after import
  combinedKey.fill(0);

  // Derive 256-bit key using HKDF with zero salt for deterministic derivation
  const salt = new Uint8Array(32); // Zero-filled salt
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('timeseal-master-key'),
    },
    hkdfKey,
    256
  );

  return await crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false, // NOT extractable
    ['encrypt', 'decrypt']
  );
}

// Encrypt data with split-key system (with memory protection and optional seed phrase)
export async function encryptData(data: string | File, options?: { useSeedPhrase?: boolean }): Promise<EncryptionResult> {
  const memory = new SecureMemory();
  
  try {
    let keyA: CryptoKey;
    let keyB: CryptoKey;
    let seedPhrase: string | undefined;

    if (options?.useSeedPhrase) {
      const seed = await generateSeedPhrase();
      seedPhrase = seed.mnemonic;
      const keyABuffer = base64ToArrayBuffer(seed.keyA);
      keyA = await crypto.subtle.importKey('raw', keyABuffer, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      const keys = await generateKeys();
      keyB = keys.keyB;
    } else {
      const keys = await generateKeys();
      keyA = keys.keyA;
      keyB = keys.keyB;
    }
    const masterKey = await deriveMasterKey(keyA, keyB);
    
    // Convert input to ArrayBuffer
    let dataBuffer: ArrayBuffer;
    if (typeof data === 'string') {
      dataBuffer = new TextEncoder().encode(data).buffer;
    } else {
      dataBuffer = await data.arrayBuffer();
    }

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt with master key
    const encryptedBlob = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      dataBuffer
    ) as ArrayBuffer;

    // Export keys as base64 strings
    const keyABuffer = await crypto.subtle.exportKey('raw', keyA);
    const keyBBuffer = await crypto.subtle.exportKey('raw', keyB);
    
    // Obfuscate keys in memory
    const keyABase64 = arrayBufferToBase64(keyABuffer);
    const keyBBase64 = arrayBufferToBase64(keyBBuffer);
    const keyAProtected = memory.protect(keyABase64);
    const keyBProtected = memory.protect(keyBBase64);
    
    // Zero original buffers
    new Uint8Array(keyABuffer).fill(0);
    new Uint8Array(keyBBuffer).fill(0);
    
    const ivBase64 = arrayBufferToBase64(iv.buffer);
    
    // Retrieve keys only when needed for return
    return {
      encryptedBlob,
      keyA: memory.retrieve(keyAProtected),
      keyB: memory.retrieve(keyBProtected),
      iv: ivBase64,
      seedPhrase,
    };
  } finally {
    memory.destroy();
  }
}

// Decrypt data with both keys
export async function decryptData(
  encryptedBlob: ArrayBuffer,
  keys: DecryptionKeys
): Promise<ArrayBuffer> {
  try {
    // Import keys from base64
    const keyA = await crypto.subtle.importKey(
      'raw',
      base64ToArrayBuffer(keys.keyA),
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    );
    
    const keyB = await crypto.subtle.importKey(
      'raw',
      base64ToArrayBuffer(keys.keyB),
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    );

    // Derive master key
    const masterKey = await deriveMasterKey(keyA, keyB);
    
    // Decrypt
    const iv = base64ToArrayBuffer(keys.iv);
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      encryptedBlob
    ) as ArrayBuffer;
  } catch (error) {
    // Check if it's an IV length error
    if (error instanceof Error && error.message.includes('iv')) {
      throw new Error('This seal was created with an incompatible version. Please create a new seal.');
    }
    throw error;
  }
}

