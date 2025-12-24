/**
 * Ephemeral Seals Module
 * Self-destructing seals that auto-delete after N views
 */

import { DatabaseProvider } from './database';

export interface EphemeralConfig {
  isEphemeral: boolean;
  maxViews: number | null;
}

export interface ViewCheckResult {
  allowed: boolean;
  viewCount: number;
  maxViews: number | null;
  shouldDelete: boolean;
}

export interface EphemeralStatus {
  isExhausted: boolean;
  viewCount: number;
  maxViews: number | null;
  firstViewedAt: number | null;
  remainingViews: number | null;
}

/**
 * Validates ephemeral seal configuration
 */
export function validateEphemeralConfig(config: EphemeralConfig): { valid: boolean; error?: string } {
  if (!config.isEphemeral) {
    return { valid: true };
  }

  if (config.maxViews !== null) {
    if (!Number.isInteger(config.maxViews)) {
      return { valid: false, error: 'maxViews must be an integer' };
    }
    if (config.maxViews < 1 || config.maxViews > 100) {
      return { valid: false, error: 'maxViews must be between 1 and 100' };
    }
  }

  return { valid: true };
}

/**
 * Generates privacy-preserving fingerprint from request
 * 
 * SECURITY NOTE: Fingerprints are based on IP + User-Agent + Language.
 * Users behind the same NAT (office/school networks) with the same browser
 * will have identical fingerprints. This is a known limitation.
 * 
 * For ephemeral seals, this prevents the same user from viewing multiple times.
 * NAT users sharing fingerprints is acceptable - they can still view once each
 * from different devices/browsers.
 * 
 * Alternative: Add session tokens or authentication for stricter per-user tracking.
 */
export async function generateFingerprint(request: Request): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';
  const lang = request.headers.get('accept-language') || 'unknown';
  
  const data = `${ip}:${ua}:${lang}`;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Checks if seal is ephemeral and exhausted
 */
export function isEphemeralExhausted(
  isEphemeral: boolean,
  viewCount: number,
  maxViews: number | null
): boolean {
  if (!isEphemeral || maxViews === null) {
    return false;
  }
  return viewCount >= maxViews;
}

/**
 * Calculates remaining views for ephemeral seal
 */
export function getRemainingViews(
  isEphemeral: boolean,
  viewCount: number,
  maxViews: number | null
): number | null {
  if (!isEphemeral || maxViews === null) {
    return null;
  }
  return Math.max(0, maxViews - viewCount);
}

/**
 * Atomic view recording and exhaustion check
 * Returns whether view is allowed and if seal should be deleted
 */
export async function recordViewAndCheck(
  db: DatabaseProvider,
  sealId: string,
  fingerprint: string,
  isEphemeral: boolean,
  currentViewCount: number,
  maxViews: number | null
): Promise<ViewCheckResult> {
  // Non-ephemeral seals always allow viewing
  if (!isEphemeral) {
    return {
      allowed: true,
      viewCount: currentViewCount,
      maxViews: null,
      shouldDelete: false,
    };
  }

  // Check if already exhausted
  if (maxViews !== null && currentViewCount >= maxViews) {
    return {
      allowed: false,
      viewCount: currentViewCount,
      maxViews,
      shouldDelete: false,
    };
  }

  // Atomic increment using database method
  const now = Date.now();
  const newViewCount = await db.recordEphemeralView(sealId, fingerprint, now);

  // Check if this view exhausted the seal
  const shouldDelete = maxViews !== null && newViewCount >= maxViews;

  return {
    allowed: true,
    viewCount: newViewCount,
    maxViews,
    shouldDelete,
  };
}

/**
 * Gets ephemeral status for a seal
 */
export function getEphemeralStatus(
  isEphemeral: boolean,
  viewCount: number,
  maxViews: number | null,
  firstViewedAt: number | null
): EphemeralStatus {
  return {
    isExhausted: isEphemeralExhausted(isEphemeral, viewCount, maxViews),
    viewCount,
    maxViews,
    firstViewedAt,
    remainingViews: getRemainingViews(isEphemeral, viewCount, maxViews),
  };
}

/**
 * Deletes seal if exhausted
 * Returns true if seal was deleted
 */
export async function deleteIfExhausted(
  db: DatabaseProvider,
  sealId: string,
  isEphemeral: boolean,
  viewCount: number,
  maxViews: number | null
): Promise<boolean> {
  if (!isEphemeralExhausted(isEphemeral, viewCount, maxViews)) {
    return false;
  }

  await db.deleteSeal(sealId);
  return true;
}
