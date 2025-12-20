// Time-Seal Crypto Library - Split-Key AES-GCM Encryption
export interface EncryptionResult {
  encryptedBlob: ArrayBuffer;
  keyA: string;
  keyB: string;
  iv: string;
}

export interface DecryptionKeys {
  keyA: string;
  keyB: string;
  iv: string;
}

// Generate two random AES-256 keys
export async function generateKeys(): Promise<{ keyA: CryptoKey; keyB: CryptoKey }> {
  const keyA = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const keyB = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

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

  // Import combined key for HKDF
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    combinedKey,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Derive 256-bit key using HKDF
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // Static salt for deterministic derivation
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

// Encrypt data with split-key system
export async function encryptData(data: string | File): Promise<EncryptionResult> {
  const { keyA, keyB } = await generateKeys();
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
  
  return {
    encryptedBlob,
    keyA: arrayBufferToBase64(keyABuffer),
    keyB: arrayBufferToBase64(keyBBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt data with both keys
export async function decryptData(
  encryptedBlob: ArrayBuffer,
  keys: DecryptionKeys
): Promise<ArrayBuffer> {
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
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}