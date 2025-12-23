# API Logic Errors & Security Issues Analysis

**Analysis Date:** 2024
**Scope:** Complete API codebase review
**Severity Levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 CRITICAL ISSUES

### 1. Race Condition in Pulse Token Validation
**Location:** `lib/sealService.ts:217-230` (pulseSeal method)
**Issue:** Token validation and nonce checking happen in wrong order, allowing replay attacks during the validation window.

```typescript
// CURRENT (VULNERABLE):
const isValid = await validatePulseToken(pulseToken, sealId, this.masterKey);
if (!isValid) {
  throw new Error(ErrorCode.INVALID_INPUT);
}

const nonceValid = await checkAndStoreNonce(nonce, this.db);
if (!nonceValid) {
  throw new Error('Replay attack detected');
}
```

**Problem:** If token is valid but nonce check fails, the token validation already consumed resources. An attacker can spam valid tokens with duplicate nonces to exhaust the nonce table.

**Fix:** Check nonce FIRST, then validate token:
```typescript
// FIXED:
const nonceValid = await checkAndStoreNonce(nonce, this.db);
if (!nonceValid) {
  throw new Error('Replay attack detected');
}

const isValid = await validatePulseToken(pulseToken, sealId, this.masterKey);
if (!isValid) {
  throw new Error(ErrorCode.INVALID_INPUT);
}
```

---

### 2. Missing Transaction Rollback in Pulse Update
**Location:** `lib/sealService.ts:245-246`
**Issue:** Two separate database updates without transaction safety. If second update fails, database is in inconsistent state.

```typescript
// VULNERABLE:
await this.db.updatePulse(seal.id, now);
await this.db.updateUnlockTime(seal.id, newUnlockTime);
```

**Problem:** If `updateUnlockTime` fails, `lastPulse` is updated but `unlockTime` is not, breaking the Dead Man's Switch logic.

**Fix:** Implement atomic transaction or single query:
```typescript
// Option 1: Single query
await this.db.updatePulseAndUnlockTime(seal.id, now, newUnlockTime);

// Option 2: Transaction with rollback
try {
  await this.db.beginTransaction();
  await this.db.updatePulse(seal.id, now);
  await this.db.updateUnlockTime(seal.id, newUnlockTime);
  await this.db.commit();
} catch (error) {
  await this.db.rollback();
  throw error;
}
```

---

### 3. Blob Deletion Before Database Deletion (Data Loss Risk)
**Location:** `lib/sealService.ts:277-290` (burnSeal method)
**Issue:** If database deletion fails after blob deletion, seal metadata remains but content is lost forever.

```typescript
// VULNERABLE:
await this.storage.deleteBlob(sealId);
await this.db.deleteSeal(sealId);
```

**Problem:** Blob is deleted first. If DB deletion fails, seal record exists but points to non-existent blob.

**Fix:** Delete in reverse order with proper error handling:
```typescript
// FIXED:
try {
  await this.db.deleteSeal(sealId);
} catch (dbError) {
  logger.error('db_delete_failed', dbError as Error, { sealId });
  throw dbError; // Don't delete blob if DB fails
}

try {
  await this.storage.deleteBlob(sealId);
} catch (storageError) {
  logger.error('blob_delete_failed', storageError as Error, { sealId });
  // DB already deleted, log but don't throw
}
```

---

## 🟠 HIGH SEVERITY ISSUES

### 4. Time-of-Check to Time-of-Use (TOCTOU) in Seal Access
**Location:** `lib/sealService.ts:147-151`
**Issue:** Time check happens, then decryption happens. If system clock changes between checks, seal could unlock early.

```typescript
// VULNERABLE:
const now = Date.now();
const isUnlocked = now >= seal.unlockTime;

if (!isUnlocked) {
  return { status: 'locked', ... };
}

// Time passes here - clock could change
const decryptedKeyB = await decryptKeyBWithFallback(...);
```

**Problem:** Between time check and key decryption, system time could be manipulated (NTP attack, VM clock skew).

**Fix:** Re-check time after decryption or use time attestation:
```typescript
// FIXED:
const now = Date.now();
const isUnlocked = now >= seal.unlockTime;

if (!isUnlocked) {
  return { status: 'locked', ... };
}

const decryptedKeyB = await decryptKeyBWithFallback(...);

// Re-verify time hasn't gone backwards
if (Date.now() < seal.unlockTime) {
  throw new Error('Time manipulation detected');
}
```

---

### 5. Pulse Token Doesn't Invalidate After Use
**Location:** `lib/sealService.ts:217-250`
**Issue:** After successful pulse, old token remains valid until expiry (5 minutes). Allows replay within window.

```typescript
// CURRENT:
const newPulseToken = await generatePulseToken(sealId, this.masterKey);
return { newUnlockTime, newPulseToken };
```

**Problem:** Old token is not explicitly invalidated. If attacker captures old token, they can replay it within 5-minute window even after new token is issued.

**Fix:** Invalidate old token in database:
```typescript
// FIXED:
await this.db.invalidatePulseToken(pulseToken);
const newPulseToken = await generatePulseToken(sealId, this.masterKey);
await this.db.updatePulseToken(seal.id, newPulseToken);
return { newUnlockTime, newPulseToken };
```

---

### 6. No Maximum Pulse Count Limit
**Location:** `lib/sealService.ts:217-250`
**Issue:** Dead Man's Switch can be pulsed infinitely, defeating the purpose and consuming database resources.

```typescript
// CURRENT: No limit check
const result = await sealService.pulseSeal(pulseToken, ip, newInterval);
```

**Problem:** Attacker with pulse token can keep seal locked forever by pulsing every 5 minutes.

**Fix:** Add maximum pulse count:
```typescript
// FIXED:
const MAX_PULSES = 365; // ~1 year if pulsed daily

if (seal.pulseCount >= MAX_PULSES) {
  throw new Error('Maximum pulse count exceeded');
}

await this.db.incrementPulseCount(seal.id);
```

---

### 7. Cron Job Deletes Seals Without Checking Expiration Setting
**Location:** `app/api/cron/route.ts:28-30`
**Issue:** Cron deletes ALL seals older than 30 days, ignoring the `expiresAfterDays` field.

```typescript
// VULNERABLE:
const sealsToDelete = await env.DB.prepare(
  'SELECT id FROM seals WHERE unlock_time < ?'
).bind(cutoffTime).all();
```

**Problem:** Seals with custom expiration (e.g., `expiresAfterDays: 60`) are deleted prematurely.

**Fix:** Respect the `expiresAt` field:
```typescript
// FIXED:
const sealsToDelete = await env.DB.prepare(
  'SELECT id FROM seals WHERE expires_at IS NOT NULL AND expires_at < ?'
).bind(Date.now()).all();
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 8. Access Count Increment Happens Even for Locked Seals
**Location:** `lib/database.ts:84-90`
**Issue:** Every getSeal call increments access count, even if seal is locked and no data is returned.

```typescript
// CURRENT:
const result = await this.db.prepare(
  'UPDATE seals SET access_count = access_count + 1 WHERE id = ? RETURNING *'
).bind(id).first();
```

**Problem:** Attacker can inflate access count by repeatedly checking locked seal, making statistics meaningless.

**Fix:** Only increment on successful unlock:
```typescript
// FIXED:
async getSeal(id: string, incrementCount: boolean = false): Promise<SealRecord | null> {
  if (incrementCount) {
    const result = await this.db.prepare(
      'UPDATE seals SET access_count = access_count + 1 WHERE id = ? RETURNING *'
    ).bind(id).first();
    return result ? this.mapResultToSealRecord(result) : null;
  }
  
  const result = await this.db.prepare('SELECT * FROM seals WHERE id = ?').bind(id).first();
  return result ? this.mapResultToSealRecord(result) : null;
}
```

---

### 9. Rate Limit Key Collision Risk
**Location:** `lib/security.ts:117-122`
**Issue:** Fingerprint uses truncated user-agent and language, causing collisions.

```typescript
// VULNERABLE:
return `${ip}:${ua.slice(0, 50)}:${lang.slice(0, 20)}`;
```

**Problem:** Different users with same IP, similar browsers, and same language get same fingerprint, sharing rate limits.

**Fix:** Use cryptographic hash:
```typescript
// FIXED:
export async function getRequestFingerprint(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ua = request.headers.get('user-agent') || '';
  const lang = request.headers.get('accept-language') || '';
  const data = `${ip}:${ua}:${lang}`;
  
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

### 10. Pulse Interval Validation Inconsistency
**Location:** `lib/validation.ts:91-102` vs `app/api/pulse/route.ts:15-18`
**Issue:** Validation function checks milliseconds, but API checks days with different limits.

```typescript
// validation.ts: 5 minutes to 30 days in MS
const minInterval = 5 * 60 * 1000;
const maxInterval = 30 * 24 * 3600 * 1000;

// pulse/route.ts: 1 to 30 days
if (newInterval <= 0 || newInterval > 30) {
  return createErrorResponse(...);
}
```

**Problem:** API accepts 1 day minimum, but validation requires 5 minutes. Inconsistent validation.

**Fix:** Unify validation:
```typescript
// FIXED in pulse/route.ts:
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 30;

if (newInterval < MIN_INTERVAL_DAYS || newInterval > MAX_INTERVAL_DAYS) {
  return createErrorResponse(ErrorCode.INVALID_INPUT, 
    `Pulse interval must be between ${MIN_INTERVAL_DAYS} and ${MAX_INTERVAL_DAYS} days`);
}
```

---

### 11. Honeypot Detection Leaks Information
**Location:** `app/api/seal/[id]/route.ts:38-45`
**Issue:** Honeypot seals return different response structure, allowing detection.

```typescript
// VULNERABLE:
if (isHoneypot(sealId)) {
  return jsonResponse({
    id: sealId,
    isLocked: true,
    unlockTime: Date.now() + 999999999999, // Obviously fake
    timeRemaining: 999999999999,
  });
}
```

**Problem:** Attacker can detect honeypots by checking for unrealistic unlock times (31+ years in future).

**Fix:** Return realistic fake data:
```typescript
// FIXED:
if (isHoneypot(sealId)) {
  const fakeUnlockTime = Date.now() + (Math.random() * 30 * 24 * 60 * 60 * 1000);
  return jsonResponse({
    id: sealId,
    isLocked: true,
    unlockTime: fakeUnlockTime,
    timeRemaining: fakeUnlockTime - Date.now(),
    isDMS: Math.random() > 0.5, // Random DMS flag
  });
}
```

---

### 12. Missing Validation for Pulse Token Format
**Location:** `lib/sealService.ts:218-220`
**Issue:** Token split happens before validation, causing array access errors.

```typescript
// VULNERABLE:
const parts = pulseToken.split(':');
if (parts.length !== 4) {
  throw new Error(ErrorCode.INVALID_INPUT);
}
const [sealId, timestamp, nonce] = parts;
```

**Problem:** If token is malformed (e.g., empty string), `parts[0]` could be undefined, causing downstream errors.

**Fix:** Validate before destructuring:
```typescript
// FIXED:
if (!pulseToken || typeof pulseToken !== 'string') {
  throw new Error(ErrorCode.INVALID_INPUT);
}

const parts = pulseToken.split(':');
if (parts.length !== 4 || parts.some(p => !p)) {
  throw new Error(ErrorCode.INVALID_INPUT);
}

const [sealId, timestamp, nonce, signature] = parts;
```

---

## 🟢 LOW SEVERITY ISSUES

### 13. Inefficient Nonce Cleanup in Memory Cache
**Location:** `lib/security.ts:177-186`
**Issue:** Cleanup runs every 60 seconds regardless of cache size, wasting CPU.

```typescript
// CURRENT:
if (typeof setInterval !== 'undefined') {
  setInterval(() => this.cleanup(), 60000);
}
```

**Problem:** Even with 1 nonce, cleanup runs every minute. Inefficient for low-traffic scenarios.

**Fix:** Lazy cleanup on threshold:
```typescript
// FIXED:
check(nonce: string): boolean {
  const now = Date.now();
  
  // Lazy cleanup when cache grows
  if (this.cache.size > 1000) {
    this.cleanup();
  }
  
  if (this.cache.has(nonce)) {
    return false;
  }
  
  this.cache.set(nonce, now);
  return true;
}
```

---

### 14. Concurrent Request Tracker Never Cleans Up
**Location:** `lib/security.ts:47-58`
**Issue:** Map grows indefinitely as IPs are added but never removed.

```typescript
// VULNERABLE:
class ConcurrentRequestTracker {
  private requests = new Map<string, number>();
  
  track(ip: string): boolean {
    const current = this.requests.get(ip) || 0;
    if (current >= 5) return false;
    this.requests.set(ip, current + 1);
    return true;
  }
  
  release(ip: string): void {
    const current = this.requests.get(ip) || 0;
    this.requests.set(ip, Math.max(0, current - 1));
  }
}
```

**Problem:** IPs with count=0 remain in map forever, causing memory leak.

**Fix:** Remove zero-count entries:
```typescript
// FIXED:
release(ip: string): void {
  const current = this.requests.get(ip) || 0;
  const newCount = Math.max(0, current - 1);
  
  if (newCount === 0) {
    this.requests.delete(ip);
  } else {
    this.requests.set(ip, newCount);
  }
}
```

---

### 15. Error Messages Leak Internal State
**Location:** `app/api/seal/[id]/route.ts:76-79`
**Issue:** Error messages expose internal error details in production.

```typescript
// VULNERABLE:
const errorMessage = error instanceof Error ? error.message : 'Unknown error';
return jsonResponse({ error: `Seal retrieval failed: ${errorMessage}` }, 500);
```

**Problem:** Database errors, file system errors, etc. are exposed to client.

**Fix:** Sanitize errors in production:
```typescript
// FIXED:
const errorMessage = process.env.NODE_ENV === 'production' 
  ? 'Seal retrieval failed' 
  : (error instanceof Error ? error.message : 'Unknown error');
return jsonResponse({ error: errorMessage }, 500);
```

---

### 16. Missing Input Sanitization in Unlock Message
**Location:** `lib/sealService.ts:95` (unlockMessage field)
**Issue:** Custom unlock messages are stored without sanitization, potential XSS vector.

```typescript
// CURRENT: No sanitization
unlockMessage: request.unlockMessage,
```

**Problem:** If frontend renders this as HTML, XSS is possible.

**Fix:** Sanitize on input:
```typescript
// FIXED:
import { sanitizeInput } from './validation';

unlockMessage: request.unlockMessage ? sanitizeInput(request.unlockMessage) : undefined,
```

---

## 📊 SUMMARY

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | Race conditions, data loss, transaction safety |
| 🟠 High | 4 | TOCTOU, token invalidation, resource exhaustion |
| 🟡 Medium | 5 | Statistics manipulation, validation inconsistencies |
| 🟢 Low | 4 | Memory leaks, error disclosure, input sanitization |
| **TOTAL** | **16** | |

---

## 🔧 RECOMMENDED FIXES PRIORITY

### Immediate (Deploy Today):
1. Fix race condition in pulse token validation (#1)
2. Add transaction safety to pulse updates (#2)
3. Fix blob deletion order (#3)
4. Respect expiresAt in cron job (#7)

### Short-term (This Week):
5. Add TOCTOU protection (#4)
6. Invalidate old pulse tokens (#5)
7. Add maximum pulse count (#6)
8. Fix access count logic (#8)

### Medium-term (This Month):
9. Improve fingerprint hashing (#9)
10. Unify validation logic (#10)
11. Fix honeypot detection (#11)
12. Add pulse token format validation (#12)

### Long-term (Next Sprint):
13. Optimize nonce cleanup (#13)
14. Fix concurrent tracker memory leak (#14)
15. Sanitize error messages (#15)
16. Add unlock message sanitization (#16)

---

## 🧪 TESTING RECOMMENDATIONS

1. **Race Condition Tests**: Concurrent pulse requests with same token
2. **Transaction Tests**: Simulate DB failures during pulse updates
3. **TOCTOU Tests**: Mock time changes during seal access
4. **Replay Attack Tests**: Reuse old pulse tokens
5. **Resource Exhaustion Tests**: Infinite pulse attempts
6. **Memory Leak Tests**: Long-running worker with many IPs

---

**End of Analysis**
