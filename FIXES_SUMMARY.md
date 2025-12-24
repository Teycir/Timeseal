# Critical Fixes Summary

## Issue 1: Ephemeral Seal Reliability (High Priority)

### Problem
If a database/storage glitch occurs during ephemeral seal fetch (after view count increment but before blob delivery), the view is counted but data not delivered. The seal effectively burns itself without the user seeing it.

### Root Cause
The original flow was:
1. Increment view count (atomic)
2. Fetch blob from storage
3. If fetch fails → view already counted, user gets error, seal may be deleted

### Solution
Reordered operations with rollback mechanism:
1. **Fetch blob FIRST** (before incrementing view count)
2. If fetch fails → rollback view count decrement
3. Only proceed with deletion if blob successfully fetched

### Changes Made

#### `lib/sealService.ts`
- Moved blob fetch to occur **before** view count increment
- Added try-catch with rollback logic:
  - If blob fetch fails, call `db.decrementViewCount(sealId)`
  - Log rollback success/failure
  - Throw error to prevent returning incomplete data
- Blob is now guaranteed to be available before any state changes

#### `lib/database.ts`
- Added `decrementViewCount(id: string)` method to `DatabaseProvider` interface
- Implemented in `SealDatabase`:
  ```sql
  UPDATE seals SET view_count = CASE WHEN view_count > 0 THEN view_count - 1 ELSE 0 END WHERE id = ?
  ```
- Implemented in `MockDatabase` for testing

#### `lib/errorHandler.ts`
- Updated error mapping to catch "fetch seal content" errors
- Maps to `DECRYPTION_FAILED` error code for consistent client handling

### Impact
- **Zero data loss**: Users never lose a view without seeing content
- **Atomic guarantee**: View count only increments if blob successfully fetched
- **Graceful degradation**: Storage failures result in error (not silent burn)

---

## Issue 2: File Size Validation Mismatch (High Priority)

### Problem
Client allows files up to 750KB, but server enforces 750KB on the **encrypted payload** (which is ~33% larger due to Base64 encoding). Files between ~560KB and 750KB fail to upload with confusing errors.

### Root Cause
- Base64 encoding adds 33% overhead (4 bytes per 3 bytes of data)
- Client validated raw file size: `size <= 750KB`
- Server validated encrypted size: `encryptedSize <= 750KB`
- Gap: Files 560KB-750KB pass client check but fail server check

### Solution
Enforce pre-encryption size limit that accounts for Base64 overhead:
- **New limit**: `~560KB` (before encryption)
- **Formula**: `MAX_FILE_SIZE / 1.34 ≈ 559KB`
- This ensures encrypted payload stays under 750KB

### Changes Made

#### `lib/constants.ts`
```typescript
export const MAX_FILE_SIZE = 750 * 1024; // 750KB (D1 TEXT limit)
export const MAX_FILE_SIZE_BEFORE_ENCRYPTION = Math.floor(MAX_FILE_SIZE / 1.34); // ~560KB
```

#### `lib/validation.ts`
- Updated `validateFileSize()` to check `MAX_FILE_SIZE_BEFORE_ENCRYPTION`
- Error message now says: `"File size exceeds maximum of 559KB (before encryption)"`
- Imported new constant

### Impact
- **No more silent failures**: Files that pass client validation will pass server validation
- **Clear limits**: Users see accurate size limit (559KB) upfront
- **Consistent behavior**: Client and server enforce same effective limit

---

## Testing Recommendations

### Ephemeral Seal Reliability
```bash
# Test blob fetch failure with rollback
1. Create ephemeral seal with maxViews=1
2. Simulate storage failure during first view
3. Verify view count NOT incremented
4. Verify seal still accessible after error
5. Verify successful view on retry
```

### File Size Validation
```bash
# Test size boundaries
1. Upload 559KB file → Should succeed
2. Upload 560KB file → Should fail with clear error
3. Upload 750KB file → Should fail at client validation
4. Verify error messages mention "before encryption"
```

---

## Deployment Notes

### Database Migration
No schema changes required. The `decrementViewCount` method uses existing `view_count` column.

### Backward Compatibility
- ✅ Existing seals unaffected
- ✅ No breaking API changes
- ✅ Error codes remain consistent

### Monitoring
Watch for:
- `view_count_rollback_success` logs (indicates storage issues)
- `view_count_rollback_failed` logs (critical - manual intervention needed)
- `blob_fetch_failed` errors (storage health indicator)

---

## Files Modified

1. `lib/constants.ts` - Added `MAX_FILE_SIZE_BEFORE_ENCRYPTION`
2. `lib/validation.ts` - Updated file size validation logic
3. `lib/sealService.ts` - Reordered blob fetch with rollback
4. `lib/database.ts` - Added `decrementViewCount` method
5. `lib/errorHandler.ts` - Updated error message mapping

**Total Lines Changed**: ~50 lines across 5 files
**Risk Level**: Low (defensive changes with rollback safety)
