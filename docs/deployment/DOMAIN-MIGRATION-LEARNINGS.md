# Domain Migration Post-Mortem: timeseal.teycir-932.workers.dev → timeseal.online

## Executive Summary

Successfully migrated TimeSeal from Cloudflare Workers subdomain to custom domain. Encountered two critical issues that required understanding Next.js build-time vs runtime environment variables and Cloudflare Workers secrets management.

**Timeline:**
- Domain purchased: Namecheap
- DNS configured: Cloudflare nameservers
- SSL/TLS: Full (strict) mode
- Issue 1: Origin validation (403 "Invalid origin")
- Issue 2: Turnstile validation (500 "INTERNAL_ERROR")

---

## Issue 1: Origin Validation Failure

### Problem
After domain migration, all API requests returned:
```json
{"error":{"code":"FORBIDDEN","message":"Invalid origin"}}
```

### Root Cause
`NEXT_PUBLIC_APP_URL` is a **build-time variable** in Next.js. It gets inlined into the JavaScript bundle during `next build` via string replacement. Setting it in:
- `wrangler.jsonc` vars ❌ (not read at build time)
- `.dev.vars` ❌ (not read at build time)
- Cloudflare dashboard ❌ (not read at build time)
- `.env.production` ✅ (read at build time, but baked into bundle)

Even after updating `.env.production` and rebuilding, the old domain persisted because the bundle was already built with the old value.

### Solution
**Switch from build-time to runtime environment variables:**

1. **Changed `lib/appConfig.ts`:**
```typescript
// BEFORE (build-time, baked into bundle)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// AFTER (runtime, read from Cloudflare Workers env)
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
```

2. **Updated `wrangler.jsonc`:**
```json
{
  "vars": {
    "APP_URL": "https://timeseal.online"
  }
}
```

3. **Simplified deploy script in `package.json`:**
```json
{
  "scripts": {
    "deploy:prod": "npx @opennextjs/cloudflare build && npx wrangler deploy"
  }
}
```

4. **Added proper error handling:**
```typescript
export function getAppUrl(): string {
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error('APP_URL environment variable is not set');
  }
  return url;
}

export function validateOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  try {
    const appUrl = getAppUrl();
    const allowedOrigins = [
      appUrl,
      appUrl.replace('https://', 'https://www.'),
    ];
    return allowedOrigins.includes(origin);
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Key Learnings
1. **`NEXT_PUBLIC_*` variables are build-time only** - They are string-replaced during `next build`
2. **Runtime variables (no prefix) are read from Cloudflare Workers env** - Set in `wrangler.jsonc` vars
3. **Clean builds don't help** - The issue is architectural, not cache-related
4. **Fallback pattern works** - `process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL` supports both runtime and build-time
5. **Error handling matters** - Check error types explicitly, re-throw unexpected errors

---

## Issue 2: Turnstile Secret Key Missing

### Problem
After fixing origin validation, API returned:
```json
{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred. Please try again."}}
```

### Root Cause
`TURNSTILE_SECRET_KEY` was stored in `.prod.vars` but **never deployed as a Cloudflare secret**. 

**Critical distinction:**
- `.prod.vars` - Local file for development, NOT automatically deployed
- `wrangler secret put` - Deploys encrypted secrets to Cloudflare Workers

### Solution
1. **Check existing secrets:**
```bash
npx wrangler secret list
# Output: Only MASTER_ENCRYPTION_KEY present
```

2. **Deploy missing secret:**
```bash
echo "0x4AAAAAACHzq-2YjQt7pL5TPWWo9bbwthM" | npx wrangler secret put TURNSTILE_SECRET_KEY
```

3. **Verify deployment:**
```bash
npx wrangler secret list
# Output: MASTER_ENCRYPTION_KEY, TURNSTILE_SECRET_KEY
```

### Key Learnings
1. **`.prod.vars` is NOT deployed automatically** - It's only for local development
2. **Secrets must be set via `wrangler secret put`** - They are encrypted and stored separately
3. **Secrets persist across deployments** - Once set, they remain until explicitly deleted
4. **Check secrets after migration** - Use `wrangler secret list` to verify

---

## Complete Migration Checklist

### Pre-Migration
- [ ] Purchase domain (Namecheap, Google Domains, etc.)
- [ ] Configure DNS with Cloudflare nameservers
- [ ] Set up SSL/TLS (Full strict mode)
- [ ] Add custom domain to Cloudflare Workers
- [ ] Update Turnstile widget hostnames in Cloudflare dashboard

### Code Changes
- [ ] Update `wrangler.jsonc` with runtime `APP_URL` variable
- [ ] Change `lib/appConfig.ts` to use runtime `process.env.APP_URL`
- [ ] Update all hardcoded domain references in code
- [ ] Update metadata URLs in `app/layout.tsx`
- [ ] Update structured data in `app/components/StructuredData.tsx`
- [ ] Update markdown templates in `app/dashboard/page.tsx`
- [ ] Update test scripts in `scripts-config.json`

### Secrets Management
- [ ] List existing secrets: `npx wrangler secret list`
- [ ] Deploy all required secrets:
  - [ ] `MASTER_ENCRYPTION_KEY`
  - [ ] `TURNSTILE_SECRET_KEY`
  - [ ] Any other environment-specific secrets
- [ ] Verify secrets are set: `npx wrangler secret list`

### Deployment
- [ ] Clean build: `rm -rf .next .open-next`
- [ ] Build: `npx @opennextjs/cloudflare build`
- [ ] Deploy: `npx wrangler deploy`
- [ ] Verify runtime variables in deploy output:
  ```
  env.APP_URL ("https://timeseal.online")      Environment Variable
  ```

### Post-Deployment Testing
- [ ] Test origin validation: `curl -H "Origin: https://newdomain.com" https://newdomain.com/api/create-seal`
- [ ] Test Turnstile widget renders on frontend
- [ ] Test seal creation end-to-end
- [ ] Check Cloudflare Workers logs for errors: `npx wrangler tail`
- [ ] Verify DNS propagation: `dig newdomain.com`
- [ ] Test SSL certificate: `curl -vI https://newdomain.com`

### Cloudflare Dashboard Configuration
- [ ] Workers & Pages → Custom Domains → Add `newdomain.com` and `www.newdomain.com`
- [ ] Turnstile → Widget → Add `newdomain.com` to allowed hostnames
- [ ] SSL/TLS → Overview → Set to "Full (strict)"
- [ ] SSL/TLS → Edge Certificates → Enable "Always Use HTTPS"
- [ ] SSL/TLS → Edge Certificates → Enable "HSTS"

---

## Architecture Insights

### Next.js Environment Variables in Cloudflare Workers

| Variable Type | Prefix | Read At | Set In | Use Case |
|--------------|--------|---------|--------|----------|
| Build-time | `NEXT_PUBLIC_*` | Build | `.env.production` | Client-side values (API keys, public URLs) |
| Runtime | None | Request | `wrangler.jsonc` vars | Server-side dynamic values (APP_URL, feature flags) |
| Secrets | None | Request | `wrangler secret put` | Sensitive values (encryption keys, API secrets) |

### Best Practices

1. **Use runtime variables for deployment-specific values:**
   - Domain URLs
   - Feature flags
   - Environment identifiers

2. **Use build-time variables for truly static values:**
   - Public API keys (Turnstile site key)
   - CDN URLs
   - Analytics IDs

3. **Use secrets for sensitive data:**
   - Encryption keys
   - API secrets
   - Database credentials

4. **Implement fallback patterns:**
   ```typescript
   const value = process.env.RUNTIME_VAR || process.env.NEXT_PUBLIC_BUILD_VAR || 'default';
   ```

5. **Add proper error handling:**
   ```typescript
   try {
     // operation
   } catch (error) {
     if (error instanceof ExpectedErrorType) {
       // handle expected error
       return fallback;
     }
     // re-throw unexpected errors
     throw error;
   }
   ```

---

## Common Pitfalls

### ❌ Assuming `.prod.vars` deploys automatically
**Reality:** `.prod.vars` is only for local development. Use `wrangler secret put` for production.

### ❌ Thinking clean builds fix environment variable issues
**Reality:** Build-time variables are baked in during `next build`. Cleaning doesn't change the source.

### ❌ Setting `NEXT_PUBLIC_*` in `wrangler.jsonc` and expecting runtime changes
**Reality:** `NEXT_PUBLIC_*` is replaced at build time. Use non-prefixed vars for runtime.

### ❌ Forgetting to update Turnstile widget hostnames
**Reality:** Turnstile validates against allowed hostnames. Add new domain in Cloudflare dashboard.

### ❌ Using bare catch blocks
**Reality:** Always check error types and re-throw unexpected errors per error handling rules.

---

## Debugging Commands

### Check deployed secrets
```bash
npx wrangler secret list
```

### Tail live logs
```bash
npx wrangler tail --format pretty
```

### Check environment variables in deployment
```bash
npm run deploy:prod | grep "env\."
```

### Test origin validation
```bash
curl -X POST https://timeseal.online/api/create-seal \
  -H "Origin: https://timeseal.online" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' -v
```

### Verify DNS propagation
```bash
dig timeseal.online
dig www.timeseal.online
```

### Check SSL certificate
```bash
curl -vI https://timeseal.online 2>&1 | grep -A5 "SSL certificate"
```

### Search bundle for hardcoded domains
```bash
grep -r "timeseal.teycir-932.workers.dev" .open-next/
```

---

## Files Modified

### Core Configuration
- `wrangler.jsonc` - Added runtime `APP_URL` variable
- `lib/appConfig.ts` - Changed to runtime variable with fallback
- `package.json` - Simplified deploy script
- `.env.production` - Updated build-time variables

### Domain References
- `app/layout.tsx` - Updated metadata URLs
- `app/components/StructuredData.tsx` - Updated schema.org URLs
- `app/dashboard/page.tsx` - Updated markdown template footer
- `scripts-config.json` - Updated load test URLs

### Error Handling
- `lib/apiHandler.ts` - Enhanced error logging with type checking
- `.amazonq/rules/error-handling.md` - Created error handling rules

---

## Success Metrics

✅ Origin validation passes with new domain  
✅ Turnstile secret deployed and accessible  
✅ All API endpoints functional  
✅ SSL/TLS configured correctly  
✅ DNS propagated globally  
✅ No hardcoded old domain references  
✅ Error handling follows best practices  
✅ Runtime variables accessible in production  

---

## Future Considerations

### For Self-Deployers
This migration pattern is **code-based and reproducible**. Self-deployers only need to:
1. Update `wrangler.jsonc` with their domain
2. Deploy secrets via `wrangler secret put`
3. Update Turnstile widget hostnames in their Cloudflare dashboard

No manual file swapping or hardcoded values required.

### For Multi-Environment Deployments
Use `wrangler.jsonc` environments:
```json
{
  "vars": {
    "APP_URL": "https://staging.timeseal.online"
  },
  "env": {
    "production": {
      "vars": {
        "APP_URL": "https://timeseal.online"
      }
    }
  }
}
```

Deploy with: `npx wrangler deploy --env production`

### For Key Rotation
See `docs/KEY-ROTATION.md` for master key rotation procedures. Secrets can be rotated without code changes:
```bash
npx wrangler secret put MASTER_ENCRYPTION_KEY
```

---

## References

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [OpenNext Cloudflare Adapter](https://opennext.js.org/cloudflare)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [TimeSeal Error Handling Rules](.amazonq/rules/error-handling.md)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-26  
**Migration Status:** ✅ Complete  
**Production URL:** https://timeseal.online
