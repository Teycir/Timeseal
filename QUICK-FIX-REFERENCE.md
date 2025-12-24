# Bug Fixes v0.9.3 - Code Changes Summary

## 1. DMS Expiration Fix

### lib/sealService.ts (Line ~450)

**BEFORE:**
```typescript
const newUnlockTime = now + intervalToUse;
const newPulseToken = await generatePulseToken(sealId, this.masterKey);

// Calculate new expiration if seal has one
const newExpiresAt = seal.expiresAt
  ? newUnlockTime + (seal.expiresAt - seal.unlockTime)
  : undefined;

// Atomic update (both or neither)
await this.db.updatePulseAndUnlockTime(seal.id, now, newUnlockTime, newExpiresAt);
```

**AFTER:**
```typescript
const newUnlockTime = now + intervalToUse;
const newPulseToken = await generatePulseToken(sealId, this.masterKey);

// Recalculate expiration from creation time if configured
const newExpiresAt = seal.expiresAt && seal.createdAt
  ? seal.createdAt + (seal.expiresAt - seal.createdAt)
  : undefined;

// Atomic update
await this.db.updatePulseAndUnlockTime(seal.id, now, newUnlockTime);
```

**Why:** Expiration should be fixed at creation time, not recalculated on every pulse.

---

## 2. Cron Job Optimization

### app/api/cron/route.ts (Line ~30)

**BEFORE:**
```typescript
const sealsToDelete = await env.DB.prepare(
  `SELECT id FROM seals 
   WHERE (expires_at IS NULL AND unlock_time < ?)
   OR (expires_at IS NOT NULL AND expires_at < ?)`
).bind(cutoffTime, now).all();

let blobsDeleted = 0;
// Delete blobs first
for (const seal of sealsToDelete.results) {
  try {
    await env.DB.prepare(
      'UPDATE seals SET encrypted_blob = NULL WHERE id = ?'
    ).bind(seal.id).run();
    blobsDeleted++;
  } catch (error) {
    console.error(`[CRON] Failed to delete blob for seal ${seal.id}:`, error);
  }
}

// Then delete seal records
const sealsResult = await env.DB.prepare(
  `DELETE FROM seals 
   WHERE (expires_at IS NULL AND unlock_time < ?)
   OR (expires_at IS NOT NULL AND expires_at < ?)`
).bind(cutoffTime, now).run();

return jsonResponse({
  success: true,
  sealsDeleted: sealsResult.meta.changes,
  blobsDeleted,
  rateLimitsDeleted: rateLimitsResult.meta.changes,
  noncesDeleted: noncesResult.meta.changes,
  cutoffTime: new Date(cutoffTime).toISOString(),
});
```

**AFTER:**
```typescript
const sealsToDelete = await env.DB.prepare(
  `SELECT id FROM seals 
   WHERE (expires_at IS NULL AND unlock_time < ?)
   OR (expires_at IS NOT NULL AND expires_at < ?)`
).bind(cutoffTime, now).all();

// Delete seals (blobs deleted automatically via encrypted_blob column)
const sealsResult = await env.DB.prepare(
  `DELETE FROM seals 
   WHERE (expires_at IS NULL AND unlock_time < ?)
   OR (expires_at IS NOT NULL AND expires_at < ?)`
).bind(cutoffTime, now).run();

return jsonResponse({
  success: true,
  sealsDeleted: sealsResult.meta.changes,
  rateLimitsDeleted: rateLimitsResult.meta.changes,
  noncesDeleted: noncesResult.meta.changes,
  cutoffTime: new Date(cutoffTime).toISOString(),
});
```

**Why:** DELETE removes entire row including encrypted_blob. No need for separate UPDATE.

---

## 3. Mobile Card Effects

### app/components/Card.tsx (Line ~20)

**BEFORE:**
```typescript
function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;

    const rect = rectRef.current || currentTarget.getBoundingClientRect();
    const { left, top } = rect;
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
}
```

**AFTER:**
```typescript
function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const rect = rectRef.current || currentTarget.getBoundingClientRect();
    const { left, top } = rect;
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
}
```

**Why:** Modern mobile browsers handle touch-to-mouse event conversion correctly. No need to disable.

---

## Files Modified

1. `lib/sealService.ts` - DMS expiration logic
2. `lib/database.ts` - Removed expiresAt parameter (no visible change, just signature)
3. `app/api/cron/route.ts` - Removed redundant blob deletion
4. `app/components/Card.tsx` - Enabled mobile effects

## Files Created

1. `tests/unit/dms-expiration-fix.test.ts` - Regression tests
2. `docs/BUG-FIXES-v0.9.3.md` - Full documentation

---

## Test Command

```bash
# Run new tests
npm run test:unit tests/unit/dms-expiration-fix.test.ts

# Run all tests
npm run test

# Run integration tests
npm run test:integration
```

---

## Verification Steps

1. **DMS Expiration:**
   ```bash
   # Create DMS seal with 7-day expiration
   # Pulse it multiple times over 10 days
   # Verify expiresAt stays constant
   ```

2. **Cron Performance:**
   ```bash
   # Check cron logs for reduced query count
   # Monitor database metrics
   ```

3. **Mobile UI:**
   ```bash
   # Open site on mobile device
   # Touch cards and verify glow effect appears
   ```

---

## Rollback Plan

If issues arise, revert these commits:
```bash
git revert HEAD~3..HEAD
```

Or manually restore:
1. Add back `newExpiresAt` calculation in `sealService.ts`
2. Add back blob deletion loop in `cron/route.ts`
3. Add back `(pointer: coarse)` check in `Card.tsx`
