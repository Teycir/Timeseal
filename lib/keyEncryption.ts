// Key Encryption - Encrypt keyB before storing in database
export async function deriveKeyEncryptionKey(
  sealId: string,
  masterKey: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(masterKey);
  
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', keyMaterial),
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(sealId),
      info: encoder.encode('keyb-encryption'),
    },
    hkdfKey,
    256
  );
  
  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptKeyB(keyB: string, masterKey: string, sealId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(keyB);
  
  const cryptoKey = await deriveKeyEncryptionKey(sealId, masterKey);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decryptKeyB(encryptedKeyB: string, masterKey: string, sealId: string): Promise<string> {
  const cryptoKey = await deriveKeyEncryptionKey(sealId, masterKey);
  
  const combined = Uint8Array.from(atob(encryptedKeyB), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

export function getMasterKey(): string {
  const key = process.env.MASTER_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('MASTER_ENCRYPTION_KEY not configured');
  }
  return key;
}
