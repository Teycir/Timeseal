// Security Utilities
import { logger } from './logger';
import { hmacSign, hmacVerify, sha256 } from './cryptoUtils';
import { getAppConfig, isOriginAllowed, isRefererAllowed } from './appConfig';

interface SecurityEnv {
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}

let cachedEnv: SecurityEnv = {};

export function setSecurityEnv(env: SecurityEnv) {
  cachedEnv = env;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function validateIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^([0-9a-f]{0,4}:){7}[0-9a-f]{0,4}$/i;
  return ipv4.test(ip) || ipv6.test(ip);
}

import { HONEYPOT_IDS, DEFAULT_ALLOWED_ORIGINS, MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_TRACKER_ENTRIES, NONCE_EXPIRY, PULSE_TOKEN_WINDOW } from './constants';

export function isHoneypot(sealId: string): boolean {
  return HONEYPOT_IDS.includes(sealId);
}

export function validateHTTPMethod(request: Request, allowed: string[]): boolean {
  return allowed.includes(request.method);
}

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return isOriginAllowed(origin);
}

class ConcurrentRequestTracker {
  private requests = new Map<string, number>();
  private readonly MAX_ENTRIES = MAX_CONCURRENT_TRACKER_ENTRIES;
  private cleanupTimer?: ReturnType<typeof setTimeout>;
  
  constructor() {
    // Auto-cleanup every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }
  
  track(ip: string): boolean {
    // Prevent memory leak
    if (this.requests.size > this.MAX_ENTRIES) {
      this.cleanup();
    }
    
    const current = this.requests.get(ip) || 0;
    if (current >= MAX_CONCURRENT_REQUESTS) return false;
    this.requests.set(ip, current + 1);
    return true;
  }
  
  release(ip: string): void {
    const current = this.requests.get(ip) || 0;
    if (current <= 1) {
      this.requests.delete(ip);
    } else {
      this.requests.set(ip, current - 1);
    }
  }
  
  private cleanup(): void {
    // Remove zero-count entries
    for (const [ip, count] of this.requests.entries()) {
      if (count === 0) {
        this.requests.delete(ip);
      }
    }
    // Emergency clear if still too large
    if (this.requests.size > this.MAX_ENTRIES) {
      this.requests.clear();
    }
  }
  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.requests.clear();
  }
}

export const concurrentTracker = new ConcurrentRequestTracker();

// Access cache with TTL cleanup (prevents memory leak)
const accessCache = new Map<string, { sealId: string; timestamp: number }>();
const ACCESS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const ACCESS_CACHE_MAX_SIZE = 10000;

export function detectSuspiciousPattern(ip: string, sealId: string): boolean {
  // Cleanup old entries to prevent memory leak
  if (accessCache.size > ACCESS_CACHE_MAX_SIZE) {
    const now = Date.now();
    for (const [key, value] of accessCache.entries()) {
      if (now - value.timestamp > ACCESS_CACHE_TTL) {
        accessCache.delete(key);
      }
    }
  }

  const lastAccess = accessCache.get(ip);
  if (lastAccess && isSequential(lastAccess.sealId, sealId)) {
    logger.warn('sequential_access_detected', { ip, sealId });
    return true;
  }
  accessCache.set(ip, { sealId, timestamp: Date.now() });
  return false;
}

function isSequential(id1: string, id2: string): boolean {
  const num1 = parseInt(id1.substring(0, 8), 16);
  const num2 = parseInt(id2.substring(0, 8), 16);
  return Math.abs(num1 - num2) === 1;
}

export async function generatePulseToken(sealId: string, secret: string): Promise<string> {
  const data = `${sealId}:${Date.now()}:${crypto.randomUUID()}`;
  const signature = await hmacSign(data, secret);
  return `${data}:${signature}`;
}

export async function validatePulseToken(token: string, sealId: string, secret: string): Promise<boolean> {
  const parts = token.split(':');
  if (parts.length !== 4) return false;
  
  const [tokenSealId, timestamp, nonce, signature] = parts;
  
  if (tokenSealId !== sealId) return false;
  
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > PULSE_TOKEN_WINDOW || tokenAge < 0) return false;
  
  const data = `${tokenSealId}:${timestamp}:${nonce}`;
  return await hmacVerify(data, signature, secret);
}

export async function getRequestFingerprint(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('user-agent') || '';
  const lang = request.headers.get('accept-language') || '';
  const data = `${ip}:${ua}:${lang}`;
  return (await sha256(data)).slice(0, 32);
}

export function sanitizeError(error: unknown): string {
  if (cachedEnv.NODE_ENV === 'production') {
    return 'An error occurred. Please try again.';
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

export function validateCSRF(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  return isOriginAllowed(origin) || isRefererAllowed(referer);
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
  private readonly nonceExpiry = NONCE_EXPIRY;

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
      if (now - timestamp > this.nonceExpiry) {
        this.cache.delete(nonce);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export function checkAndStoreNonce(nonce: string, db?: import('./database').DatabaseProvider): boolean | Promise<boolean> {
  if (db) {
    const expiresAt = Date.now() + NONCE_EXPIRY;
    return db.storeNonce(nonce, expiresAt);
  }
  // Fallback to in-memory for dev
  return NonceCache.getInstance().check(nonce);
}
