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

// Derive master key from Key A + Key B
async function deriveMasterKey(keyA: CryptoKey, keyB: CryptoKey): Promise<CryptoKey> {
  const keyABuffer = await crypto.subtle.exportKey('raw', keyA);
  const keyBBuffer = await crypto.subtle.exportKey('raw', keyB);
  
  // XOR the keys to create master key material
  const masterKeyMaterial = new Uint8Array(32);
  const keyAArray = new Uint8Array(keyABuffer);
  const keyBArray = new Uint8Array(keyBBuffer);
  
  for (let i = 0; i < 32; i++) {
    masterKeyMaterial[i] = keyAArray[i] ^ keyBArray[i];
  }

  return await crypto.subtle.importKey(
    'raw',
    masterKeyMaterial,
    { name: 'AES-GCM' },
    false,
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
    dataBuffer = new TextEncoder().encode(data);
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
  );

  // Export keys as base64 strings
  const keyABuffer = await crypto.subtle.exportKey('raw', keyA);
  const keyBBuffer = await crypto.subtle.exportKey('raw', keyB);
  
  return {
    encryptedBlob,
    keyA: arrayBufferToBase64(keyABuffer),
    keyB: arrayBufferToBase64(keyBBuffer),
    iv: arrayBufferToBase64(iv)
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
    false,
    ['decrypt']
  );
  
  const keyB = await crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(keys.keyB),
    { name: 'AES-GCM' },
    false,
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
  );
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