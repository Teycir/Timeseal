# Security Policy

## Threat Model

Time-Seal is designed to protect against:
- ✅ Server compromise (split-key architecture + encrypted storage)
- ✅ Database breach (triple-layer encryption)
- ✅ Early access attempts (time validation + encrypted keys)
- ✅ Admin deletion (WORM compliance)
- ✅ Man-in-the-middle (HTTPS + client-side crypto)
- ✅ Client-side time manipulation (server-side validation)

## Encryption Architecture

### Triple-Layer Encryption

**All seals are encrypted in the database with three security layers:**

#### Layer 1: Client-Side Encryption (AES-GCM-256)
```typescript
// User's browser encrypts content BEFORE sending to server
const { keyA, keyB } = await generateKeys();
const masterKey = await deriveMasterKey(keyA, keyB);
const encryptedBlob = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  masterKey,
  dataBuffer
);
```

**Result:** Encrypted ciphertext that requires BOTH keys to decrypt

#### Layer 2: Server-Side Key Encryption
```typescript
// Key B is encrypted with master key before database storage
const encryptedKeyB = await encryptKeyB(keyB, MASTER_ENCRYPTION_KEY, sealId);
```

**Result:** Even if database is breached, Key B is encrypted

#### Layer 3: Database Storage
```sql
-- What's actually stored in D1 database:
CREATE TABLE seals (
  id TEXT PRIMARY KEY,
  encrypted_blob TEXT,      -- AES-GCM-256 ciphertext (base64)
  key_b TEXT NOT NULL,      -- Encrypted with master key
  iv TEXT NOT NULL,         -- Public (needed for decryption)
  unlock_time INTEGER       -- Metadata
);
```

**Database contents:**
- ✅ Encrypted blob (AES-GCM-256 ciphertext)
- ✅ Encrypted Key B (AES-GCM-256 with master key)
- ✅ IV (public, needed for decryption)
- ✅ Metadata (unlock time, timestamps)
- ❌ NO plaintext content EVER stored

### What an Attacker with Database Access CANNOT Do:

1. **Decrypt content** - Needs Key A (in URL hash, never sent to server)
2. **Decrypt Key B** - Needs master encryption key (environment secret)
3. **Modify unlock time** - Cryptographically signed
4. **Access content early** - Server enforces time-lock

### Decryption Flow (Only After Unlock Time)

```typescript
// 1. Server checks time
if (Date.now() >= unlockTime) {
  // 2. Server decrypts Key B with master key
  const keyB = await decryptKeyB(encryptedKeyB, MASTER_KEY, sealId);
  
  // 3. Server sends Key B to client
  return { keyB, encryptedBlob };
}

// 4. Client combines keys and decrypts
const masterKey = await deriveMasterKey(keyA, keyB);
const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  masterKey,
  encryptedBlob
);
```

## Time-Lock Security

### How Time Validation Works

1. **Server-Side Time Check**: All unlock time validation happens on Cloudflare Workers using `Date.now()`
2. **Key B Withholding**: Server refuses to release Key B until `serverTime >= unlockTime`
3. **Trusted Time Source**: Cloudflare Workers use NTP-synchronized clocks across their global network

### Attack Scenarios & Defenses

#### ❌ Client Changes System Clock
**Attack**: User sets their device clock forward to bypass countdown
**Defense**: Time check happens server-side; client clock is irrelevant

#### ❌ Attacker Compromises Server Clock
**Attack**: Gain root access to server and change system time
**Defense**: 
- Cloudflare Workers run in isolated V8 contexts
- No root access to underlying infrastructure
- Time synchronized via Cloudflare's NTP infrastructure

#### ❌ Time Skew Attack
**Attack**: Exploit clock drift between client and server
**Defense**: Only server time matters; client countdown is cosmetic

#### ⚠️ Cloudflare Infrastructure Compromise
**Risk**: If Cloudflare's entire infrastructure is compromised, time could theoretically be manipulated
**Mitigation**: This is outside our threat model (requires nation-state level attack)

### Time Validation Code

```typescript
// lib/sealService.ts (line 103-110)
const now = Date.now(); // Server time, not client time
const isUnlocked = now >= seal.unlockTime;

let decryptedKeyB: string | undefined;
if (isUnlocked) {
  decryptedKeyB = await decryptKeyBWithFallback(seal.keyB, sealId, [this.masterKey]);
  metrics.incrementSealUnlocked();
}
```

The server **never trusts client-provided time** and always uses its own clock.

## Known Limitations

### 🟡 Medium
1. **No Authentication** - Anyone with seal ID can check status (by design for public vaults)
2. **Key A in URL Hash** - Visible in browser history, bookmarks, and referrer logs
3. **Pulse Token Replay** - Nonce validation prevents replays but tokens are long-lived

### 🟢 Low / Accepted Trade-offs
4. **Seal ID Enumeration** - Cryptographically random IDs (16 bytes) make guessing impractical
5. **Public Vault Access** - Anyone can view countdown timer (content remains encrypted)

## Mitigations

### ✅ Implemented
- **Rate Limiting** - 10-20 req/min per IP across all API endpoints
- **Cryptographically Random Seal IDs** - 16-byte random IDs (not sequential)
- **Turnstile CAPTCHA** - On seal creation to prevent automation
- **Nonce Validation** - Pulse tokens include nonces to prevent replay attacks
- **Client-side Encryption** - Key A never sent to server
- **Split-Key Architecture** - No single point of failure
- **HTTPS-only** - Enforced by Cloudflare
- **Input Validation** - File size limits, time constraints
- **Audit Logging** - Immutable access trail

### 🔧 Optional Enhancements
```typescript
// Additional Cloudflare WAF rules
// IP reputation filtering
// Geographic restrictions
// Advanced bot detection
```

## Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Email: security@timeseal.dev (or create private security advisory)

Expected response time: 48 hours

## Disclosure Policy

- Report received → Acknowledged within 48h
- Fix developed → Coordinated disclosure timeline
- Patch released → Public disclosure + credit

## Security Checklist for Production

- [x] Rate limiting enabled (10-20 req/min per IP)
- [x] Cryptographically random seal IDs (16-byte)
- [x] Turnstile CAPTCHA on seal creation
- [x] Nonce validation for pulse tokens
- [x] Input validation (file size, time constraints)
- [x] Audit logging with immutable trail
- [x] HTTPS-only enforcement
- [x] Master key encryption for Key B storage
- [x] Key rotation procedures documented
- [x] File upload limits (25MB Cloudflare Pages limit)
- [x] Content-Security-Policy headers
- [x] Memory protection for Key A (v0.6.0)
- [x] Browser extension detection (v0.6.0)
- [x] Warrant canary at /canary (v0.6.0)
- [x] Security dashboard (v0.6.0)
- [ ] Cloudflare WAF rules (optional)
- [ ] IP reputation filtering (optional)
- [ ] Geographic restrictions (optional)
- [ ] Honeypot seals for enumeration detection (optional)

## Recent Security Enhancements

**v0.6.0 (2025-01-15):**
- Memory protection for Key A (XOR obfuscation)
- Browser extension detection and warnings
- Built-in warrant canary at /canary
- Security dashboard with real-time alerts
- Multi-party time attestation
- Self-hosting guide for infrastructure independence

**v0.5.1 (2025-12-22):****
- CRITICAL FIX: HKDF deterministic salt (all seals now decryptable)
- Server-only pulse token generation (removed client UUID)
- Time check ordering (prevents timing attacks)
- **SECURITY FIX: Implemented missing burn endpoint**

**v0.5.0 (2025-12-22):**
- Cryptographic receipts with HMAC signatures
- DB-backed rate limiting and nonce storage
- Browser fingerprinting for rate limits
- Timing attack mitigation with response jitter

See [SECURITY-ENHANCEMENTS.md](SECURITY-ENHANCEMENTS.md):

1. **Master Key Rotation** - Dual-key support, 90-day schedule
2. **Upload Limits** - 10MB default, three-layer enforcement
3. **Client Integrity** - CSP headers, runtime verification

## Browser Security

Users should:
- Use incognito/private browsing for sensitive seals
- Clear browser history after accessing vault links
- Never share vault links over unencrypted channels
- Verify HTTPS certificate before entering data

## Cryptographic Details

- **Algorithm**: AES-GCM-256
- **Key Derivation**: HKDF-SHA256 with deterministic zero salt
- **Key Generation**: Two random 256-bit AES keys (keyA + keyB)
- **Master Key**: Derived from concatenated keys via HKDF
- **IV**: Random 12 bytes per encryption
- **Auth Tag**: 128 bits (AES-GCM)
- **Deterministic Derivation**: Zero salt ensures same keys produce same master key
