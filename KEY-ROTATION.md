# Master Encryption Key Rotation Strategy

## Overview
The `MASTER_ENCRYPTION_KEY` encrypts all Key B values stored in the D1 database. Rotating this key requires re-encrypting all active seals.

## Rotation Schedule
- **Recommended**: Every 90 days
- **Mandatory**: Annually or after suspected compromise

## Pre-Rotation Checklist
- [ ] Backup D1 database
- [ ] Generate new master key: `openssl rand -base64 32`
- [ ] Schedule maintenance window (estimated: 5-10 minutes per 10,000 seals)
- [ ] Notify users of brief read-only period

## Rotation Process

### 1. Generate New Key
```bash
NEW_KEY=$(openssl rand -base64 32)
echo "New key: $NEW_KEY"
```

### 2. Deploy Rotation Script
```bash
wrangler d1 execute timeseal-db --file=./scripts/rotate-master-key.sql
```

### 3. Update Environment Variable
```bash
# Cloudflare Dashboard: Workers & Pages > timeseal > Settings > Variables
# Update MASTER_ENCRYPTION_KEY with NEW_KEY
```

### 4. Verify Rotation
```bash
npm run test:key-rotation
```

## Rollback Procedure
If rotation fails:
1. Restore `MASTER_ENCRYPTION_KEY` to previous value
2. Restore D1 database from backup
3. Investigate failure logs

## Zero-Downtime Rotation (Implemented)

The system supports dual-key decryption during rotation:

```typescript
// lib/keyEncryption.ts
export function getMasterKeys(): string[] {
  const current = process.env.MASTER_ENCRYPTION_KEY;
  const previous = process.env.MASTER_ENCRYPTION_KEY_PREVIOUS;
  return previous ? [current, previous] : [current];
}

export async function decryptKeyBWithFallback(
  encryptedKeyB: string, 
  sealId: string
): Promise<string> {
  const keys = getMasterKeys();
  for (const key of keys) {
    try {
      return await decryptKeyB(encryptedKeyB, key, sealId);
    } catch (e) {
      continue; // Try next key
    }
  }
  throw new Error('Failed to decrypt with any available key');
}
```

### Rotation Steps
1. Set `MASTER_ENCRYPTION_KEY_PREVIOUS` to current key
2. Set `MASTER_ENCRYPTION_KEY` to new key
3. Run re-encryption script (optional, for cleanup)
4. Remove `MASTER_ENCRYPTION_KEY_PREVIOUS` after all seals re-encrypted

## Monitoring
Track key age in metrics:
```typescript
const keyAge = Date.now() - KEY_ROTATION_TIMESTAMP;
if (keyAge > 90 * 24 * 60 * 60 * 1000) {
  logger.warn('Master key rotation overdue');
}
```

## Emergency Rotation
If key is compromised:
1. Immediately rotate key (follow steps 1-3)
2. Audit all seal access logs
3. Notify affected users
4. File incident report
