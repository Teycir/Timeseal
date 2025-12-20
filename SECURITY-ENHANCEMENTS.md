# Security Enhancements

Three critical security enhancements implemented for TIME-SEAL.

## 1. Master Key Rotation

**Dual-key support for zero-downtime rotation:**

```typescript
// lib/keyEncryption.ts
export function getMasterKeys(): string[] {
  const current = process.env.MASTER_ENCRYPTION_KEY;
  const previous = process.env.MASTER_ENCRYPTION_KEY_PREVIOUS;
  return previous ? [current, previous] : [current];
}
```

**Rotation steps:**
```bash
wrangler secret put MASTER_ENCRYPTION_KEY_PREVIOUS  # Set old key
wrangler secret put MASTER_ENCRYPTION_KEY           # Set new key
node scripts/rotate-keys.ts                         # Re-encrypt (optional)
wrangler secret delete MASTER_ENCRYPTION_KEY_PREVIOUS
```

**Schedule:** Every 90 days

---

## 2. File Upload Limits (10MB)

**Three-layer enforcement:**

1. **Worker**: Content-Length check (fastest)
2. **Validation**: File size validation
3. **Storage**: R2 enforcement (final)

**Configuration:**
```bash
MAX_FILE_SIZE_MB=10  # .env or wrangler.toml
```

---

## 3. Client Integrity Verification

**Security headers** (automatic via next.config.js):
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

**Runtime checks** (lib/clientIntegrity.ts):
- Web Crypto API verification
- Tampering detection
- Secure context enforcement

---

## Testing

```bash
# Key rotation
npm test tests/unit/security-enhancements.test.ts

# Upload limits
curl -X POST http://localhost:3000/api/create-seal \
  -H "Content-Length: 11000000" -F "encryptedBlob=@large.bin"
# Expected: 413

# Integrity (browser console)
import { verifyIntegrity } from './lib/clientIntegrity';
await verifyIntegrity(); // Should return true
```

---

## Deployment

```bash
# Generate and set master key
openssl rand -base64 32
wrangler secret put MASTER_ENCRYPTION_KEY

# Deploy
wrangler deploy
```

**Environment variables:**
- `MASTER_ENCRYPTION_KEY` (required)
- `MASTER_ENCRYPTION_KEY_PREVIOUS` (optional, for rotation)
- `MAX_FILE_SIZE_MB=10` (default)

---

See [KEY-ROTATION.md](KEY-ROTATION.md) for detailed rotation procedures.
