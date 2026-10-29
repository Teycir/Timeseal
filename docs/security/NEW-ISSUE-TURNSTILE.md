# NEW ISSUE: Turnstile Token Missing After Domain Migration

## Problem
After successfully fixing the origin validation issue by switching from build-time `NEXT_PUBLIC_APP_URL` to runtime `APP_URL`, the `/api/create-seal` endpoint now returns:

```json
{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred. Please try again."}}
```

User reports: **"the turnstile now is gone"**

## Context

### What Was Fixed (v1)
- **Root cause**: `NEXT_PUBLIC_APP_URL` was baked into bundle at build time with old domain `timeseal.teycir-932.workers.dev`
- **Solution**: Changed `lib/appConfig.ts` to use runtime `process.env.APP_URL` instead
- **Result**: Origin validation now passes (no more 403 "Invalid origin" error)

### Current State (v2)
- Origin validation: ✅ WORKING
- Turnstile validation: ❌ BROKEN
- Error: Generic "INTERNAL_ERROR" from `/api/create-seal`

## Technical Details

### Environment Variables
**wrangler.jsonc:**
```json
{
  "vars": {
    "APP_URL": "https://timeseal.online"
  }
}
```

**Secrets (set via wrangler):**
- `MASTER_ENCRYPTION_KEY` - ✅ Set
- `TURNSTILE_SECRET_KEY` - ❓ Unknown if set correctly

### API Endpoint
- **URL**: `POST https://timeseal.online/api/create-seal`
- **Expected behavior**: Validate Turnstile token before creating seal
- **Current behavior**: Returns generic internal error

### Test Request
```bash
curl -X POST https://timeseal.online/api/create-seal \
  -H "Content-Type: application/json" \
  -H "Origin: https://timeseal.online" \
  -d '{
    "encryptedBlob": "test_blob_data",
    "encryptedKeyB": "test_key_b",
    "iv": "test_iv_value",
    "unlockTime": "2025-01-20T12:00:00Z",
    "mode": "TIMED",
    "turnstileToken": "dummy_token_for_testing"
  }'
```

**Response:**
```json
{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred. Please try again."}}
```

## Hypothesis

### Possible Causes
1. **Turnstile secret key not set in production environment**
   - May have been set for old domain but not migrated
   - Check: `wrangler secret list`

2. **Turnstile widget configuration issue**
   - Widget may still be configured for old domain
   - Cloudflare dashboard may need hostname update

3. **Turnstile validation endpoint changed**
   - API may be using hardcoded old domain for validation
   - Check `lib/turnstile.ts` or similar validation code

4. **Environment variable not accessible at runtime**
   - Similar to `APP_URL` issue, Turnstile secret may need runtime access
   - Check if using `process.env.TURNSTILE_SECRET_KEY` correctly

## Investigation Needed

### Files to Check
1. **Turnstile validation logic**: Find where Turnstile token is validated
2. **Environment variable access**: Verify `TURNSTILE_SECRET_KEY` is read at runtime
3. **Error logging**: Check if there's more detailed error info being suppressed
4. **Cloudflare dashboard**: Verify Turnstile widget hostname configuration

### Questions for User
1. Was `TURNSTILE_SECRET_KEY` re-set after domain migration?
2. Is Turnstile widget configured for `timeseal.online` in Cloudflare dashboard?
3. Are there any error logs in Cloudflare Workers dashboard?

## Expected Solution Pattern
Based on the previous fix, likely need to:
1. Verify Turnstile secret is set: `wrangler secret list`
2. Check if Turnstile validation code uses correct domain
3. Ensure runtime access to `TURNSTILE_SECRET_KEY`
4. Update Turnstile widget hostname in Cloudflare dashboard if needed

## Error Handling Note
Per `.amazonq/rules/error-handling.md`, the code should NOT be using bare catch blocks. If the error is being caught and returning generic "INTERNAL_ERROR", we need to:
1. Check error type explicitly
2. Re-throw unexpected errors
3. Log errors with context
4. Only catch expected error types (e.g., `TurnstileValidationError`)

---

## ✅ Resolution (2025-01-20)

### Root Cause
`validateTurnstile()` existed in `lib/turnstile.ts` and the Turnstile widget rendered client-side
(via `@marsidev/react-turnstile` in `CreateSealForm.tsx` with the public `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
from `.env.production`), sending `cf-turnstile-response` in FormData — **but `app/api/create-seal/route.ts`
never called `validateTurnstile()`**. The helper was dead code. Additionally, `TURNSTILE_SECRET_KEY`
was never deployed to the Worker, so even if the call had existed, it would have been bypassed.

### Fix Applied
1. **`app/api/create-seal/route.ts`** — Added server-side validation:
   - Extracts `cf-turnstile-response` from FormData
   - Calls `validateTurnstile(token, ip)` using the client's IP
   - Gated on `process.env.TURNSTILE_SECRET_KEY` so local dev & integration tests (which don't
     send a Turnstile token) continue to work — production enforcement only activates when the
     secret is set
   - Returns `TURNSTILE_REQUIRED` (403) when token is missing, `TURNSTILE_INVALID` (403) on failure

2. **`lib/errors.ts`** — Added `TURNSTILE_REQUIRED` (403) and `TURNSTILE_INVALID` (403) error codes.

3. **`lib/turnstile.ts`** — Hardened: added `response.ok` check, parses & logs Cloudflare `error-codes`.

4. **Env types** — Added `TURNSTILE_SECRET_KEY?` to `CloudflareEnv` in `env.d.ts`, `lib/container.ts`,
   `lib/routeHelper.ts` (matching the existing `process.env.MASTER_ENCRYPTION_KEY` pattern used elsewhere).

5. **`TURNSTILE_SECRET_KEY`** deployed via `wrangler secret put TURNSTILE_SECRET_KEY` (NOT in `.env.production`).

### Verification
- `npx tsc --noEmit` → exit 0
- `npx jest tests/unit` → 148/148 passed
- `NODE_ENV=production npx next build` → exit 0
- Production curl tests (live, post-deploy):
  - Missing token → `403 TURNSTILE_REQUIRED` ✓
  - Invalid/fake token → `403 TURNSTILE_INVALID` ✓
  - Site GET → `200` ✓

### Deployment
- **Commit:** `7d20d7e feat(security): wire up Cloudflare Turnstile server-side validation on create-seal`
- **Deploy:** `npx wrangler deploy` → Version ID: `39738579-2ca5-40b6-8e84-7e536594e6ac`

### Outstanding Recommendation
The site key `0x4AAAAAACHzq8TngxZwCTuD` in `.env.production` matches the key documented as
**leaked/compromised** in `docs/deployment/TURNSTILE-ROTATION-GUIDE.md`. Cloudflare may throttle
the compromised widget, causing slow load times. Follow that guide to rotate to a fresh
site key + secret key pair when convenient.
