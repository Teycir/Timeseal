# SECURITY INCIDENT: Secrets Leaked in Git Commit

## Incident Summary

**Date:** 2025-01-26  
**Severity:** HIGH  
**Status:** MITIGATED (secrets removed from repo, rotation required)

## What Happened

During domain migration, `.prod.vars` file containing production secrets was accidentally committed to git repository and pushed to GitHub.

**Commit:** `60fd74f`  
**File:** `.prod.vars`  
**Exposure:** Public GitHub repository

## Leaked Secrets

1. **MASTER_ENCRYPTION_KEY** - Used for encrypting Key B before database storage
2. **TURNSTILE_SECRET_KEY** - Used for Cloudflare Turnstile bot protection validation

**NOT leaked:**
- Database credentials (stored in Cloudflare, not in files)
- User data (encrypted with split-key architecture)
- Seal content (requires both Key A and Key B)

## Immediate Actions Taken

1. ✅ Added `.prod.vars` to `.gitignore`
2. ✅ Removed `.prod.vars` from git tracking
3. ✅ Committed and pushed fix (commit `e768019`)

## Required Actions (URGENT)

### 1. Rotate MASTER_ENCRYPTION_KEY

**⚠️ WARNING:** Rotating master key will make existing seals unreadable. See migration strategy below.

```bash
# Generate new key
openssl rand -base64 32

# Example output: cqyvlhMU1qcTXIg6Xci/Bm1ZkjO5xua+7efnhivbfzw=

# Set new key
echo "cqyvlhMU1qcTXIg6Xci/Bm1ZkjO5xua+7efnhivbfzw=" | npx wrangler secret put MASTER_ENCRYPTION_KEY
```

### 2. Rotate TURNSTILE_SECRET_KEY

**Option A: Generate new Turnstile widget (RECOMMENDED)**
1. Go to Cloudflare Dashboard → Turnstile
2. Create new widget for `timeseal.online`
3. Get new secret key
4. Deploy new secret:
```bash
echo "NEW_SECRET_KEY" | npx wrangler secret put TURNSTILE_SECRET_KEY
```
5. Update frontend with new site key in `.env.production`:
```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=NEW_SITE_KEY
```
6. Rebuild and deploy

**Option B: Rotate existing widget secret**
1. Cloudflare Dashboard → Turnstile → Your Widget → Rotate Secret
2. Deploy new secret via wrangler

### 3. Master Key Migration Strategy

**Problem:** Existing seals are encrypted with old master key. Rotating breaks them.

**Solution A: Zero-downtime migration (RECOMMENDED)**

1. **Add dual-key support:**
```typescript
// lib/encryption.ts
async function decryptKeyB(encryptedKeyB: string, iv: string): Promise<string> {
  const newKey = process.env.MASTER_ENCRYPTION_KEY;
  const oldKey = process.env.MASTER_ENCRYPTION_KEY_OLD;
  
  try {
    // Try new key first
    return await decrypt(encryptedKeyB, newKey, iv);
  } catch (error) {
    if (error instanceof TypeError) {
      // Expected decryption failure, try old key
      if (oldKey) {
        return await decrypt(encryptedKeyB, oldKey, iv);
      }
    }
    throw error;
  }
}
```

2. **Deploy old key as fallback:**
```bash
echo "I7P7xgYToBXcgS1ZBG8XMt7kWYIxeyUJEB6RfRltphQ=" | npx wrangler secret put MASTER_ENCRYPTION_KEY_OLD
```

3. **Deploy new key:**
```bash
echo "cqyvlhMU1qcTXIg6Xci/Bm1ZkjO5xua+7efnhivbfzw=" | npx wrangler secret put MASTER_ENCRYPTION_KEY
```

4. **Migrate existing seals (background job):**
```typescript
// scripts/migrate-seals.ts
async function migrateSeals() {
  const seals = await db.prepare('SELECT * FROM seals WHERE migrated = 0').all();
  
  for (const seal of seals.results) {
    // Decrypt with old key
    const keyB = await decryptKeyB(seal.encrypted_key_b, seal.iv);
    
    // Re-encrypt with new key
    const newEncryptedKeyB = await encryptKeyB(keyB, seal.iv);
    
    // Update database
    await db.prepare('UPDATE seals SET encrypted_key_b = ?, migrated = 1 WHERE id = ?')
      .bind(newEncryptedKeyB, seal.id)
      .run();
  }
}
```

5. **After migration complete, remove old key:**
```bash
npx wrangler secret delete MASTER_ENCRYPTION_KEY_OLD
```

**Solution B: Accept data loss (NOT RECOMMENDED)**

1. Rotate key immediately
2. Existing seals become unreadable
3. Users lose access to locked content
4. Only acceptable if no active seals exist

## Impact Assessment

### If Attacker Has Leaked Keys

**MASTER_ENCRYPTION_KEY:**
- ❌ Can decrypt Key B from database
- ✅ Still needs Key A (in URL hash, never sent to server)
- ✅ Cannot decrypt seal content without both keys
- ⚠️ Can read Key B for all seals in database

**TURNSTILE_SECRET_KEY:**
- ❌ Can bypass bot protection
- ❌ Can create unlimited seals
- ✅ Cannot access existing seal content
- ⚠️ Can spam database with fake seals

### User Data Safety

**Seal content remains safe because:**
1. Split-key architecture: Key A never leaves browser
2. Attacker needs BOTH Key A and Key B to decrypt
3. Key A is in URL hash (user must share vault link)
4. Even with master key, attacker only gets Key B

**Worst case scenario:**
- Attacker gets database dump + leaked master key
- Attacker still needs vault links (Key A) to decrypt content
- User data remains encrypted without vault links

## Prevention Measures

### Immediate
1. ✅ Add `.prod.vars` to `.gitignore`
2. ✅ Add `.env.production` to `.gitignore` (if contains secrets)
3. ✅ Create `.env.example` with placeholder values
4. ✅ Document secret management in README

### Long-term
1. Add pre-commit hook to scan for secrets
2. Use git-secrets or similar tool
3. Implement secret rotation schedule (quarterly)
4. Add monitoring for unauthorized seal creation
5. Implement rate limiting per fingerprint (already done)

## Git History Cleanup (Optional)

**⚠️ WARNING:** Rewriting git history breaks all forks and clones.

If repository is private or no external users:
```bash
# Remove file from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .prod.vars" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

If repository is public:
- Accept that secrets are in history
- Focus on rotation instead of history rewrite
- GitHub retains deleted commits for 90 days

## Lessons Learned

1. **Never commit `.prod.vars` or `.dev.vars`** - These are local-only files
2. **Secrets belong in Cloudflare Workers secrets** - Use `wrangler secret put`
3. **`.gitignore` is critical** - Review before first commit
4. **Pre-commit hooks prevent accidents** - Implement secret scanning
5. **Rotation procedures must exist** - Document before incident occurs

## References

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [TimeSeal Key Rotation Guide](KEY-ROTATION.md)
- [Git Secrets Tool](https://github.com/awslabs/git-secrets)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

**Incident Status:** OPEN (rotation pending)  
**Next Review:** After key rotation complete  
**Responsible:** Repository owner
