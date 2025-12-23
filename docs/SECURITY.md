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

## Attack Defenses

### 🛡️ Defense-in-Depth Architecture

Time-Seal implements multiple overlapping security layers:

#### Layer 1: Cryptographic Defenses
- **AES-GCM-256 encryption** - Industry-standard authenticated encryption
- **Split-key architecture** - Key A (client) + Key B (server) both required
- **HMAC-signed pulse tokens** - Prevents token forgery
- **Nonce replay protection** - Database-backed, atomic validation
- **Master key encryption** - Key B encrypted before storage
- **SHA-256 blob hashing** - Content integrity verification

#### Layer 2: Time-Lock Enforcement
- **Server-side time validation** - Client clock manipulation impossible
- **Cloudflare NTP-synchronized timestamps** - Trusted time source
- **Atomic database operations** - Prevents race conditions
- **Random jitter (0-100ms)** - Prevents timing attacks
- **Time check before decryption** - No early access possible

#### Layer 3: Access Control
- **SHA-256 fingerprinting** - Collision-resistant rate limiting (IP + UA + Lang)
- **Database-backed nonces** - Replay detection across all workers
- **Cloudflare Turnstile** - Bot protection without CAPTCHA friction
- **Concurrent request limiting** - 5 simultaneous requests per IP
- **Strict input validation** - Format checks reject malformed data
- **Request sanitization** - XSS and injection prevention

#### Layer 4: Operational Security
- **Immutable audit logging** - All access tracked permanently
- **Transaction rollback** - Database consistency on failures
- **Circuit breakers** - Automatic retry with exponential backoff
- **Error sanitization** - No internal state leakage
- **Warrant canary** - Legal coercion transparency
- **Memory leak protection** - Automatic cleanup mechanisms

### 🔒 Specific Attack Mitigations

#### Replay Attacks
**Attack:** Reuse captured pulse token to extend seal indefinitely
**Defense:**
- Nonce checked FIRST (atomic database operation)
- Nonce stored in D1 database (persists across workers)
- Token signature validated SECOND (HMAC-SHA256)
- Concurrent requests blocked by atomic nonce check

#### Race Conditions
**Attack:** Send 100 concurrent pulse requests with same token
**Defense:**
- Database nonce check is atomic (first request wins)
- Pulse updates combined into single SQL operation
- Transaction rollback on any failure
- No partial state possible

#### Rate Limit Bypass
**Attack:** Rotate IPs or change user-agent to bypass limits
**Defense:**
- Fingerprints hashed with SHA-256 (full data, no truncation)
- Combines IP + User-Agent + Accept-Language
- Stored in D1 database (persists across workers)
- Collision-resistant (2^256 keyspace)

#### Timing Attacks
**Attack:** Measure response times to detect unlock time
**Defense:**
- Random jitter (0-100ms) added to all responses
- Time check happens before any operations
- Constant-time comparisons for sensitive data

#### Data Loss
**Attack:** Blob deleted but database deletion fails
**Defense:**
- Database deleted FIRST (reversible)
- Blob deleted SECOND (idempotent)
- Errors logged but don't block deletion
- Orphaned blobs acceptable (seal is gone)

#### Token Injection
**Attack:** Send malformed pulse tokens to crash server
**Defense:**
- Strict regex validation for all token parts
- Seal ID: 32 hex characters
- Timestamp: positive integer
- Nonce: UUID format
- Signature: base64
- Rejected before processing

#### Memory Exhaustion
**Attack:** Create millions of concurrent requests
**Defense:**
- Concurrent tracker limited to 10K entries
- Automatic cleanup when limit reached
- Zero-count entries removed first
- Emergency clear if still oversized

#### Access Count Inflation
**Attack:** Repeatedly check locked seal to inflate metrics
**Defense:**
- Access count only increments on successful unlock
- Locked checks don't increment counter
- Accurate usage analytics

### 🔐 Cryptographic Guarantees

**What is mathematically impossible:**
- Decrypt without Key A (never sent to server)
- Decrypt without Key B (encrypted with master key)
- Forge pulse token signature (HMAC-SHA256)
- Modify unlock time (stored in database)
- Replay pulse token (nonce validation)
- Brute-force AES-GCM-256 (2^256 keyspace)

**What requires infrastructure compromise:**
- Manipulate server time (Cloudflare NTP)
- Access master encryption key (environment secret)
- Modify database directly (Cloudflare D1 access)

## Recent Security Enhancements

**v0.9.1 (2025-01-18):**
- **Encrypted Local Storage** - Browser-based encrypted vault for saving seals
  - AES-GCM-256 encryption with unique key per browser
  - No server-side storage of user's vault links
  - Privacy-first: All data encrypted locally in localStorage
  - Manual save action (user controls what's stored)
- **Simplified Security Model** - Removed seed phrase complexity
  - Always uses cryptographically random keys
  - No recovery mechanism (by design)
  - Users responsible for saving vault links
  - Three-button interface: COPY | DOWNLOAD | SAVE

**v0.6.2 (2025-12-23):****
- **CRITICAL FIX: Replay attack prevention** - Nonce checked atomically before token validation
- **CRITICAL FIX: Atomic pulse updates** - Single database operation prevents partial state
- **CRITICAL FIX: Safe deletion order** - Database deleted first, then blob
- Strict pulse token format validation (seal ID, timestamp, nonce, signature)
- SHA-256 fingerprint hashing (prevents rate limit collisions)
- Memory leak protection (concurrent tracker auto-cleanup)
- Access count accuracy (only increments on unlock)
- File size alignment (750KB enforced at all layers)

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
