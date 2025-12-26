# Shell Script Security Assessment

## 🎯 Answer: YES - Keep .sh files local (with exceptions)

## 🔴 HIGH RISK - Must NOT be committed

### 1. Secret Generation Scripts
**Files**: 
- `scripts/setup-secrets.sh` - Generates MASTER_ENCRYPTION_KEY
- `scripts/setup-turnstile.sh` - Handles Turnstile secrets
- `scripts/setup-cloudflare.sh` - Cloudflare API tokens

**Risk**: 
- ❌ Generates secrets and writes to `.env.local`
- ❌ May contain API tokens in command history
- ❌ Could leak secrets if committed

**Recommendation**: ✅ Already in `.gitignore` via `.env*.local` pattern

---

## 🟡 MEDIUM RISK - Review before committing

### 2. Deployment Scripts
**Files**:
- `scripts/deploy.sh` - May contain production URLs
- `scripts/migrate-prod.sh` - Production database operations
- `scripts/backup-db.sh` - Database backup paths

**Risk**:
- ⚠️ May contain production URLs/endpoints
- ⚠️ Could reveal infrastructure details
- ⚠️ Backup paths might expose sensitive locations

**Recommendation**: Review for hardcoded URLs/paths before commit

---

## 🟢 LOW RISK - Safe to commit

### 3. Test Scripts
**Files**: `scripts/tests/*.sh` (25+ files)
- Test runners, validation scripts, integration tests

**Risk**: ✅ None - Use localhost/test data only

### 4. Setup Scripts
**Files**:
- `scripts/setup-d1.sh` - Database schema setup
- `scripts/init-db.sh` - Database initialization
- `scripts/setup.sh` - General setup

**Risk**: ✅ None - Generic setup, no secrets

---

## 📋 Current .gitignore Status

```gitignore
# ✅ GOOD - Secrets protected
.env*.local

# ✅ GOOD - History excluded
.history

# ❌ MISSING - Shell scripts not explicitly excluded
# (Currently relying on developers to not commit secrets)
```

---

## 🔒 Recommended .gitignore Additions

Add to `.gitignore`:

```gitignore
# Shell scripts with secrets (explicit exclusion)
scripts/setup-secrets.sh
scripts/setup-turnstile.sh
scripts/setup-cloudflare.sh
scripts/*-prod.sh
scripts/backup-db.sh

# Or exclude all setup scripts
scripts/setup-*.sh

# Backup files
backups/
*.backup
*.bak
```

---

## ✅ Safe to Commit (Whitelist)

These are safe and SHOULD be committed:

```bash
# Test scripts (all safe)
scripts/tests/*.sh

# Generic setup (no secrets)
scripts/setup-d1.sh
scripts/init-db.sh
scripts/setup.sh

# Integration tests
tests/integration/*.sh
```

---

## 🚨 Security Checklist

Before committing ANY .sh file:

1. ✅ No hardcoded secrets (keys, tokens, passwords)
2. ✅ No production URLs/endpoints
3. ✅ No database connection strings
4. ✅ No API keys or credentials
5. ✅ No internal IP addresses
6. ✅ No file paths revealing infrastructure

---

## 🎯 Specific Recommendations

### Option 1: Exclude All Setup Scripts (Safest)
```gitignore
# Exclude all setup scripts (may contain secrets)
scripts/setup-*.sh
scripts/*-prod.sh
scripts/backup-*.sh
```

### Option 2: Explicit Exclusion (More Control)
```gitignore
# Exclude specific secret-handling scripts
scripts/setup-secrets.sh
scripts/setup-turnstile.sh
scripts/setup-cloudflare.sh
scripts/migrate-prod.sh
scripts/backup-db.sh
```

### Option 3: Template Approach (Best Practice)
```bash
# Commit templates, exclude actual scripts
scripts/setup-secrets.sh.template  # ✅ Commit
scripts/setup-secrets.sh           # ❌ Exclude

# In .gitignore:
scripts/setup-*.sh
!scripts/setup-*.sh.template
```

---

## 🔍 Audit Results

Checked 40+ shell scripts:

| Category | Count | Risk | Action |
|----------|-------|------|--------|
| Secret generation | 3 | 🔴 HIGH | Exclude |
| Production ops | 3 | 🟡 MEDIUM | Review |
| Test scripts | 25+ | 🟢 LOW | Commit |
| Setup scripts | 5 | 🟢 LOW | Commit |

---

## 💡 Best Practices

### 1. Use Environment Variables
```bash
# ❌ BAD
MASTER_KEY="abc123..."

# ✅ GOOD
MASTER_KEY="${MASTER_ENCRYPTION_KEY}"
```

### 2. Use Templates
```bash
# setup-secrets.sh.template
MASTER_KEY=$(openssl rand -base64 32)
echo "Set this in Cloudflare: $MASTER_KEY"
# Don't write to files
```

### 3. Use Secret Managers
```bash
# ✅ BEST
wrangler secret put MASTER_ENCRYPTION_KEY
# Never write secrets to disk
```

### 4. Add Pre-commit Hooks
```bash
# .git/hooks/pre-commit
#!/bin/bash
if git diff --cached --name-only | grep -q "setup-secrets.sh"; then
  echo "❌ Blocked: setup-secrets.sh contains secrets"
  exit 1
fi
```

---

## 🎯 Final Recommendation

**Add to .gitignore NOW**:

```gitignore
# Shell scripts that may contain secrets
scripts/setup-secrets.sh
scripts/setup-turnstile.sh
scripts/setup-cloudflare.sh
scripts/migrate-prod.sh
scripts/backup-db.sh
scripts/deploy.sh

# Backup directories
backups/
*.backup
```

**Keep in repo** (safe):
- All `scripts/tests/*.sh`
- All `tests/integration/*.sh`
- `scripts/setup-d1.sh`
- `scripts/init-db.sh`
- `scripts/setup.sh`

---

**Verdict**: 🔴 **HIGH PRIORITY** - Update .gitignore immediately to prevent accidental secret leaks.
