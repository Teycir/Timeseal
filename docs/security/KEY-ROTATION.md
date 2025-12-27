# Key Rotation Guide

Guide for rotating the master encryption key used to encrypt Key B in the database.

## When to Rotate

- Suspected key compromise
- Employee departure with key access
- Scheduled rotation (recommended: annually)
- Security audit requirement

## Rotation Process

### 1. Generate New Key

```bash
openssl rand -base64 32
```

### 2. Set New Key in Wrangler

```bash
wrangler secret put MASTER_ENCRYPTION_KEY_NEW
```

### 3. Deploy Migration Script

Re-encrypt all existing seals with new key (requires custom migration script).

### 4. Update Production Key

```bash
wrangler secret put MASTER_ENCRYPTION_KEY
# Enter the new key value
```

### 5. Remove Old Key

```bash
wrangler secret delete MASTER_ENCRYPTION_KEY_NEW
```

## Downtime

Key rotation requires brief downtime (5-10 minutes) during re-encryption.

## Rollback

Keep old key in secure backup for 30 days in case rollback is needed.

## Testing

Always test rotation in staging environment first.
