# Scripts

## Key Rotation

### rotate-keys.ts
Re-encrypts all Key B values with a new master key.

```bash
node scripts/rotate-keys.ts <OLD_KEY> <NEW_KEY>
```

### rotate-master-key.sql
Database migration for key rotation.

```bash
wrangler d1 execute timeseal-db --file=./scripts/rotate-master-key.sql
```

## Other Scripts

### security-test.sh
Runs security penetration tests.

### setup-cloudflare.sh
Initial Cloudflare infrastructure setup.

### load-test.js
Performance and load testing.

---

See [KEY-ROTATION.md](../KEY-ROTATION.md) for complete rotation procedures.
