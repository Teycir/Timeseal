# Environment Configuration Guide

## Setting Your Production URL

Your production URL (`https://timeseal.teycir-932.workers.dev`) is now configured via environment variables instead of being hardcoded.

### Local Development

**File:** `.env.local`
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**File:** `.dev.vars` (for Cloudflare Workers local dev)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Deployment

#### Option 1: Using Wrangler CLI (Recommended)

Set the environment variable in Cloudflare Workers:

```bash
wrangler secret put NEXT_PUBLIC_APP_URL
# When prompted, enter: https://timeseal.teycir-932.workers.dev
```

#### Option 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → Your Worker
3. Go to **Settings** → **Variables**
4. Add environment variable:
   - **Name:** `NEXT_PUBLIC_APP_URL`
   - **Value:** `https://timeseal.teycir-932.workers.dev`
   - **Type:** Plain text (not encrypted)

#### Option 3: Using wrangler.toml

**File:** `wrangler.toml`
```toml
[env.production]
vars = { NEXT_PUBLIC_APP_URL = "https://timeseal.teycir-932.workers.dev" }
```

### Verification

After deployment, verify the configuration is working:

```bash
# Test CORS headers
curl -I https://timeseal.teycir-932.workers.dev/api/health \
  -H "Origin: https://timeseal.teycir-932.workers.dev"

# Should return:
# Access-Control-Allow-Origin: https://timeseal.teycir-932.workers.dev
```

### How It Works

The `lib/appConfig.ts` module reads `NEXT_PUBLIC_APP_URL` and uses it for:

1. **CORS validation** - Allows requests from your domain
2. **CSRF protection** - Validates origin/referer headers
3. **Public links** - Generates correct URLs in responses

```typescript
// lib/appConfig.ts
export function getAppConfig(): AppConfig {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (isDevelopment ? 'http://localhost:3000' : '');

  if (!appUrl && isProduction) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production');
  }

  return {
    appUrl,
    allowedOrigins: [appUrl, ...developmentOrigins],
    isDevelopment,
    isProduction,
  };
}
```

### Custom Domain Setup

If you want to use a custom domain (e.g., `timeseal.dev`):

1. Set up custom domain in Cloudflare Workers
2. Update environment variable:
   ```bash
   wrangler secret put NEXT_PUBLIC_APP_URL
   # Enter: https://timeseal.dev
   ```
3. Redeploy

### Multiple Environments

For staging/production separation:

**wrangler.toml:**
```toml
[env.staging]
vars = { NEXT_PUBLIC_APP_URL = "https://staging.timeseal.dev" }

[env.production]
vars = { NEXT_PUBLIC_APP_URL = "https://timeseal.teycir-932.workers.dev" }
```

Deploy to specific environment:
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

### Troubleshooting

**Issue:** CORS errors in production

**Solution:** Verify `NEXT_PUBLIC_APP_URL` is set correctly:
```bash
wrangler secret list
# Should show: NEXT_PUBLIC_APP_URL
```

**Issue:** "NEXT_PUBLIC_APP_URL must be set in production" error

**Solution:** The environment variable is missing. Set it using one of the methods above.

**Issue:** Wrong URL in responses

**Solution:** Clear Cloudflare cache and redeploy:
```bash
wrangler deploy --force
```

### Security Notes

- ✅ `NEXT_PUBLIC_APP_URL` is **not** a secret (it's public)
- ✅ No hardcoded URLs in code
- ✅ Environment-specific configuration
- ✅ Automatic validation on startup

### Current Configuration

**Development:** `http://localhost:3000`  
**Production:** `https://timeseal.teycir-932.workers.dev`

Both are now configured via environment variables! 🎉
