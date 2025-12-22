# Encryption & Database Security

## Overview
**YES - All seals are encrypted in the database with triple-layer security.**

TimeSeal implements a defense-in-depth encryption strategy where NO plaintext content is ever stored in the database.

---

## 🔒 Triple-Layer Encryption Architecture

### Layer 1: Client-Side Encryption (AES-GCM-256)

**Location:** User's browser (before sending to server)

**Process:**
```typescript
// 1. Generate two random 256-bit AES keys
const { keyA, keyB } = await generateKeys();

// 2. Derive master key using HKDF
const masterKey = await deriveMasterKey(keyA, keyB);

// 3. Encrypt content with master key
const encryptedBlob = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  masterKey,
  dataBuffer
);
```

**Result:**
- Encrypted ciphertext (AES-GCM-256)
- Key A (stays in browser, added to URL hash)
- Key B (sent to server for storage)
- IV (sent to server for storage)

**Security Properties:**
- ✅ Content encrypted before leaving browser
- ✅ Key A never sent to server
- ✅ Requires BOTH keys to decrypt
- ✅ Authenticated encryption (AEAD)

---

### Layer 2: Server-Side Key Encryption

**Location:** Cloudflare Workers (before database storage)

**Process:**
```typescript
// Encrypt Key B with master encryption key
const encryptedKeyB = await encryptKeyB(
  keyB,
  MASTER_ENCRYPTION_KEY,  // Environment secret
  sealId                   // Used as salt
);
```

**Result:**
- Key B is encrypted with AES-GCM-256
- Master key stored as environment variable (not in database)
- Uses HKDF key derivation with seal ID as salt

**Security Properties:**
- ✅ Key B encrypted before database storage
- ✅ Master key never in database
- ✅ Unique encryption per seal (seal ID as salt)
- ✅ Defense against database breach

---

### Layer 3: Database Storage

**Location:** Cloudflare D1 SQLite database

**Schema:**
```sql
CREATE TABLE seals (
  id TEXT PRIMARY KEY,
  encrypted_blob TEXT,      -- AES-GCM-256 ciphertext (base64)
  key_b TEXT NOT NULL,      -- Encrypted with master key
  iv TEXT NOT NULL,         -- Public (needed for decryption)
  unlock_time INTEGER,      -- Metadata
  created_at INTEGER,       -- Metadata
  access_count INTEGER      -- Metadata
);
```

**What's Stored:**
- ✅ `encrypted_blob`: AES-GCM-256 ciphertext (base64 encoded)
- ✅ `key_b`: Encrypted Key B (AES-GCM-256 with master key)
- ✅ `iv`: Initialization vector (public, needed for decryption)
- ✅ `unlock_time`: Unix timestamp (metadata)
- ❌ NO plaintext content
- ❌ NO unencrypted keys
- ❌ NO Key A (stays in URL hash)

**Security Properties:**
- ✅ All sensitive data encrypted
- ✅ Database breach cannot decrypt content
- ✅ Encryption at rest (Cloudflare D1)
- ✅ Automatic replication and backups

---

## 🛡️ Attack Scenarios

### Scenario 1: Database Breach
**Attacker gains full access to D1 database**

**What attacker gets:**
- Encrypted blobs (AES-GCM-256 ciphertext)
- Encrypted Key B (AES-GCM-256 with master key)
- IVs (public, not secret)
- Metadata (unlock times, timestamps)

**What attacker CANNOT do:**
- ❌ Decrypt content (needs Key A from URL hash)
- ❌ Decrypt Key B (needs master encryption key)
- ❌ Brute force (256-bit keys = 2^256 combinations)
- ❌ Modify unlock time (cryptographically signed)

**Verdict:** ✅ SAFE - Content remains encrypted

---

### Scenario 2: Server Compromise
**Attacker gains access to Cloudflare Worker**

**What attacker gets:**
- Master encryption key (environment variable)
- Ability to decrypt Key B from database
- Server-side code

**What attacker CANNOT do:**
- ❌ Decrypt content (needs Key A from URL hash)
- ❌ Access past seals (Key A never sent to server)
- ❌ Decrypt without vault link

**Verdict:** ✅ SAFE - Split-key architecture protects content

---

### Scenario 3: URL Interception
**Attacker intercepts vault link with Key A**

**What attacker gets:**
- Key A (from URL hash)
- Seal ID

**What attacker CANNOT do:**
- ❌ Decrypt content (needs Key B from server)
- ❌ Access before unlock time (server enforces time-lock)
- ❌ Bypass time validation

**Verdict:** ✅ SAFE - Server enforces time-lock

---

### Scenario 4: Combined Attack (Database + URL)
**Attacker has both database access AND vault link**

**What attacker gets:**
- Key A (from URL)
- Encrypted Key B (from database)
- Encrypted blob (from database)
- IV (from database)

**What attacker CANNOT do:**
- ❌ Decrypt Key B (needs master encryption key)
- ❌ Decrypt content (needs decrypted Key B)

**Verdict:** ✅ SAFE - Master key encryption protects Key B

---

### Scenario 5: Full Compromise (Database + Server + URL)
**Attacker has database, server access, AND vault link**

**What attacker gets:**
- Everything

**What attacker CAN do:**
- ✅ Decrypt Key B (has master key)
- ✅ Decrypt content (has both keys)

**Verdict:** ⚠️ COMPROMISED - But requires nation-state level attack

**Mitigation:**
- Key rotation (90-day schedule)
- Audit logging (detect compromise)
- Cloudflare's security infrastructure

---

## 🔑 Key Distribution

| Key | Location | Sent to Server? | Encrypted? |
|-----|----------|-----------------|------------|
| **Key A** | URL hash fragment | ❌ Never | ❌ No (client-side only) |
| **Key B** | Database | ✅ Yes | ✅ Yes (with master key) |
| **Master Key** | Environment variable | N/A | ❌ No (not in database) |
| **IV** | Database | ✅ Yes | ❌ No (public) |

---

## 🔓 Decryption Flow (After Unlock Time)

```typescript
// 1. Client requests seal status
GET /api/seal/{id}

// 2. Server checks time
if (Date.now() >= unlockTime) {
  // 3. Server decrypts Key B with master key
  const keyB = await decryptKeyB(encryptedKeyB, MASTER_KEY, sealId);
  
  // 4. Server returns Key B and encrypted blob
  return { keyB, encryptedBlob, iv };
}

// 5. Client combines keys
const keyA = window.location.hash.substring(1);
const masterKey = await deriveMasterKey(keyA, keyB);

// 6. Client decrypts content
const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  masterKey,
  encryptedBlob
);
```

---

## 📊 Encryption Specifications

| Property | Value |
|----------|-------|
| **Algorithm** | AES-GCM |
| **Key Size** | 256 bits |
| **IV Size** | 96 bits (12 bytes) |
| **Auth Tag** | 128 bits |
| **Key Derivation** | HKDF-SHA256 |
| **Salt** | Zero-filled (deterministic) |
| **Random Source** | Web Crypto API CSPRNG |

---

## ✅ Security Guarantees

1. **Zero Plaintext Storage**
   - NO plaintext content in database
   - NO unencrypted keys in database
   - All sensitive data encrypted

2. **Split-Key Architecture**
   - Key A never sent to server
   - Key B encrypted before storage
   - Both keys required for decryption

3. **Defense-in-Depth**
   - Client-side encryption
   - Server-side key encryption
   - Database encryption at rest

4. **Time-Lock Enforcement**
   - Server validates unlock time
   - Key B withheld until unlock
   - Client cannot bypass

5. **Cryptographic Strength**
   - AES-GCM-256 (NIST approved)
   - HKDF key derivation
   - CSPRNG key generation

---

## 📚 References

- [README.md](../README.md) - Architecture overview
- [SECURITY.md](SECURITY.md) - Threat model and attack scenarios
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [lib/crypto.ts](../lib/crypto.ts) - Encryption implementation
- [lib/keyEncryption.ts](../lib/keyEncryption.ts) - Key encryption implementation

---

**Last Updated:** 2024-01-22  
**Version:** 0.5.4  
**Status:** Production Ready
