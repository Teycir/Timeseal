// Security Utilities
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function generatePulseToken(sealId: string, secret: string): Promise<string> {
  const data = `${sealId}:${Date.now()}:${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${data}:${sigBase64}`;
}

export async function validatePulseToken(token: string, sealId: string, secret: string): Promise<boolean> {
  const parts = token.split(':');
  if (parts.length !== 4) return false;
  
  const [tokenSealId, timestamp, nonce, signature] = parts;
  
  if (tokenSealId !== sealId) return false;
  
  const tokenAge = Date.now() - parseInt(timestamp);
  if (tokenAge > 300000 || tokenAge < 0) return false; // 5 minute window
  
  const data = `${tokenSealId}:${timestamp}:${nonce}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
}

export function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred. Please try again.';
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

export function validateCSRF(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ].filter(Boolean);
  
  return allowedOrigins.some(allowed => 
    origin?.startsWith(allowed as string) || referer?.startsWith(allowed as string)
  );
}

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/json',
  'text/csv',
];

export function validateContentType(contentType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(contentType);
}

// Singleton pattern for nonce cache with cleanup
class NonceCache {
  private static instance: NonceCache;
  private cache = new Map<string, number>();
  private readonly NONCE_EXPIRY = 300000; // 5 minutes

  private constructor() {
    // Auto-cleanup every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60000);
    }
  }

  static getInstance(): NonceCache {
    if (!NonceCache.instance) {
      NonceCache.instance = new NonceCache();
    }
    return NonceCache.instance;
  }

  check(nonce: string): boolean {
    const now = Date.now();
    
    if (this.cache.has(nonce)) {
      return false; // Replay detected
    }
    
    this.cache.set(nonce, now);
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [nonce, timestamp] of this.cache.entries()) {
      if (now - timestamp > this.NONCE_EXPIRY) {
        this.cache.delete(nonce);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export function checkAndStoreNonce(nonce: string): boolean {
  return NonceCache.getInstance().check(nonce);
}
