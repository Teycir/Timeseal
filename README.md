<div align="center">

![License](https://img.shields.io/badge/license-BSL-neon_green?style=for-the-badge)
![Encryption](https://img.shields.io/badge/Encryption-AES--GCM-neon_green?style=for-the-badge)
![Storage](https://img.shields.io/badge/Storage-D1_Database-neon_green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Operational-neon_green?style=for-the-badge)

# ⏳ TIME-SEAL
### The Unbreakable Protocol

![Time-Seal Animation](public/timeseal_ascii.svg)

### *"If I go silent, this speaks for me."*

[Create a Seal](https://timeseal.teycir-932.workers.dev) · [View Architecture](#-architecture) · [Report Bug](https://github.com/teycir/timeseal/issues)

</div>

---

## ⚡ Overview

**TIME-SEAL** is a cryptographically enforced time-locked vault system built on Cloudflare's edge infrastructure. It allows you to encrypt a file or message that **mathematically cannot be opened** until a specific moment in the future.

![Time-Seal Architecture](public/explainerimage.png)

### Why is this different?
> most "future message" apps contain "trust me bro" promises. Time-Seal is **Cryptographically Enforced** at the Edge.

---

## 🏗️ Architecture

<div align="center">
  <h3>Zero-Trust • Edge-Native • Unbreakable</h3>
</div>

### 🔒 Layer 1: The Vault (D1 Database Storage)
> **Encrypted Storage**
Files are stored encrypted in Cloudflare D1 database. The encrypted blobs are stored alongside metadata, with cryptographic enforcement preventing early access.

### 🤝 Layer 2: The Handshake (Split-Key Crypto)
> **Trust-Minimized**
We use a Split-Key architecture to ensure no single party can decrypt the data early.
*   **Key A (User):** Stored in the URL hash. Never sent to the server.
*   **Key B (Server):** Stored in D1 database inside the secure enclave.
*   **The Check:** The server refuses to release Key B until `Now > Unlock_Time`.

### 💓 Layer 3: The Pulse (Dead Man's Switch)
> **Automated Release**
If used as a Dead Man's Switch, the user must click a private "Pulse Link" periodically. If they fail to check in, the seal unlocks automatically for the recipient.

---

## 🧠 Logic Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API
    participant D1_DB

    Note over User, Browser: Phase A: Sealing
    User->>Browser: Enters Secret + Time
    Browser->>Browser: Generate Key A + Key B
    Browser->>Browser: Encrypt Secret (Key A + Key B)
    Browser->>API: Send EncryptedBlob + Key B + Time
    API->>D1_DB: Store Blob + Key B + Time
    API-->>Browser: Return Seal ID
    Browser-->>User: Show Link (#KeyA)

    Note over User, Browser: Phase B: Waiting (Seal Active)
    User->>Browser: Opens Link (#KeyA)
    Browser->>API: Request Seal Status
    API->>D1_DB: Check Time
    D1_DB-->>API: Locked
    API-->>Browser: Status 403: "LOCKED" (Key B Withheld)
    Browser-->>User: Show Countdown Timer ⏳

    Note over User, Browser: Phase C: Unlocking (Seal Broken)
    User->>Browser: Opens Link (After Time)
    Browser->>API: Request Seal Status
    API->>D1_DB: Check Time
    D1_DB-->>API: Unlocked
    API-->>Browser: Status 200: Return Key B
    Browser->>Browser: Combine Key A + Key B
    Browser->>Browser: Decrypt Secret
    Browser-->>User: Display Decrypted Message �
```

---

## 🎯 Use Cases

### 💀 The Crypto Holder
**Scenario:** "I have my seed phrase in a Time-Seal. If I die, it unlocks for my wife after 30 days of silence. If I'm alive, I reset the timer."

**How it works:**
1. Create a Dead Man's Switch seal with your seed phrase
2. Set pulse interval to 30 days
3. Share the public vault link with your wife
4. Keep the private pulse link secret
5. Click the pulse link every 30 days to keep it locked
6. If you die/disappear, the seal auto-unlocks for your wife

### 🕵️ The Whistleblower
**Scenario:** "I have evidence. If I am arrested and can't click the reset button, the evidence goes public automatically."

**How it works:**
1. Upload sensitive documents to a Dead Man's Switch seal
2. Set pulse interval to 7 days
3. Share the public vault link with journalists/activists
4. Pulse every week to keep evidence locked
5. If arrested/silenced, evidence automatically releases
6. Creates accountability and protection

### 🚀 The Marketer
**Scenario:** "I'm dropping a limited edition product. The link is public now, but nobody can buy until the timer hits zero."

**How it works:**
1. Create timed release seal with product details/access codes
2. Set exact launch date and time
3. Share vault link publicly on social media
4. Build anticipation with countdown timer
5. Product automatically unlocks at launch time
6. Creates viral marketing buzz

### 🎁 The Gift Giver
**Scenario:** "I want to send a birthday message that unlocks exactly at midnight on their birthday."

**How it works:**
1. Write personal message or upload video
2. Set unlock time to birthday midnight
3. Send vault link in advance
4. Recipient sees countdown until birthday
5. Message unlocks at perfect moment
6. Creates magical surprise experience

### 🏛️ The Legal Professional
**Scenario:** "I need to ensure this contract becomes active only after the settlement date."

**How it works:**
1. Seal legal documents with specific unlock date
2. Share vault link with all parties
3. Documents remain cryptographically locked
4. Auto-unlock when settlement period expires
5. Ensures compliance and timing
6. Provides immutable proof of timing

---

## 🛡️ Security: Attack Scenarios

### "Can I just change my computer's clock to unlock it early?"
**❌ NO.** The unlock time is checked on the **server**, not your computer. Your local clock is irrelevant.

### "What if I hack the server and change the time there?"
**❌ NO.** Time-Seal runs on Cloudflare Workers—you don't have root access. The time comes from Cloudflare's NTP-synchronized infrastructure.

### "Can I intercept the API request and modify the unlock time?"
**❌ NO.** The unlock time is stored in the database when you create the seal. API requests can't modify it.

### "What if I steal Key B from the database?"
**⚠️ PARTIAL.** Key B is encrypted with a master key. Even if you steal it, you still need:
1. The master encryption key (environment secret)
2. Key A (stored in the URL hash, never sent to server)
3. Both keys to decrypt

### "Can I brute-force the encryption?"
**❌ NO.** AES-GCM-256 with cryptographically random keys. Would take billions of years with current technology.

### "What if I find the seal ID and try to access it?"
**✅ YES, BUT...** You can see the countdown timer, but you **cannot decrypt** without:
- Key A (in the URL hash)
- Key B (server releases only after unlock time)

### "Can I bypass rate limits by rotating IPs or using VPNs?"
**⚠️ HARDER.** Rate limiting uses browser fingerprinting (IP + User-Agent + Language), making simple IP rotation ineffective. You'd need to change your entire browser signature.

### "Can I use timing attacks to detect the exact unlock time?"
**❌ NO.** Server responses include random jitter (0-100ms delay) to prevent timing-based information leakage.

### "Why is there no user authentication?"
**✅ BY DESIGN.** Authentication adds attack vectors (credential theft, phishing, password breaches, session hijacking). TimeSeal uses cryptography-only security: possession of the vault link (Key A) is the authentication. No passwords to steal, no accounts to hack.

### "Can I replay old API requests to trick the server?"
**❌ NO.** Pulse tokens include nonces and timestamps. Replay attacks are detected and rejected.

### "What if Cloudflare goes down?"
**⏸️ PAUSED.** Your seal remains locked in the database. When Cloudflare comes back online, the countdown resumes.

### "Can the admin/creator decrypt my seal early?"
**❌ NO.** Not even the creator can decrypt early. The server enforces the time-lock mathematically.

### "What if I lose the vault link?"
**💀 LOST FOREVER.** Key A is in the URL hash. No Key A = No decryption. **Save your links securely.**

### "Is Key A in the URL hash secure?"
**✅ YES, BY DESIGN.** The URL hash is never sent to the server (unlike query parameters). HTTPS protects it in transit. Browser history/bookmarks are your responsibility—treat vault links like passwords. This is the tradeoff for zero-trust, no-authentication security. Alternative approaches (server-side key storage, password protection) would defeat the entire architecture.

### "Can I delete or cancel a seal after creating it?"
- **Timed Release:** ❌ NO. WORM storage prevents deletion.
- **Dead Man's Switch:** ✅ YES. Use the pulse token to burn the seal permanently.

---

## 🛠️ Tech Stack

*   **Frontend:** `Next.js 14` (App Router)
*   **Runtime:** `Cloudflare Workers`
*   **Database:** `Cloudflare D1` (SQLite)
*   **Storage:** `Cloudflare D1` (Encrypted Blobs)
*   **Crypto:** `Web Crypto API` (Native AES-GCM)
*   **Security:** Browser Fingerprinting, Rate Limiting, Input Validation
*   **Styling:** `Tailwind CSS` (Cipher-punk Theme)

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to create your first seal.

### 🔐 Production Deployment

The app is deployed at **[https://timeseal.teycir-932.workers.dev](https://timeseal.teycir-932.workers.dev)**

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Set production secrets
openssl rand -base64 32  # Generate key
wrangler secret put MASTER_ENCRYPTION_KEY
```

---

## 📚 Documentation

- [API Reference](docs/API.md) - Complete REST API documentation
- [Architecture Guide](docs/ARCHITECTURE.md) - Design patterns and abstractions
- [Deployment Guide](docs/DEPLOYMENT.md) - Cloudflare setup instructions
- [Security Documentation](docs/SECURITY.md) - Threat model and security controls
- [Trust Assumptions](docs/TRUST-ASSUMPTIONS.md) - What you must trust to use TimeSeal
- [Security Enhancements](docs/SECURITY-ENHANCEMENTS.md) - Key rotation, upload limits, integrity
- [Key Rotation Guide](docs/KEY-ROTATION.md) - Master key rotation procedures
- [Security Testing](docs/SECURITY-TESTING.md) - Penetration testing guide
- [Audit Logging](docs/AUDIT-LOGGING.md) - Immutable audit trail for all operations
- [Testing Guide](docs/TESTING.md) - Complete testing documentation
- [Testing Infrastructure](docs/TESTING-INFRASTRUCTURE.md) - Test setup and configuration
- [Changelog](docs/CHANGELOG.md) - Version history and changes
- [TODO](docs/TODO.md) - Production readiness checklist

This project is licensed under the **Business Source License (BSL)**.

- **Free for non-commercial use**
- **Commercial use requires license**
- **Source code available for inspection**
- **Converts to Apache 2.0 after 4 years**

See [LICENSE](LICENSE) for full terms.

---

## 🔮 Roadmap

**Recently Implemented:**
- ✅ Audit Logging - Immutable access trail
- ✅ Code Deduplication - Cleaner API routes  
- ✅ Test Infrastructure - Fast, reliable tests

**Recently Completed:**
- ✅ Production Deployment - Live at timeseal.teycir-932.workers.dev
- ✅ Cloudflare Workers Migration - Migrated from deprecated @cloudflare/next-on-pages

See [TODO.md](docs/TODO.md) for complete checklist.

---

<div align="center">

**Built with 💚 and 🔒 by [Teycir Ben Soltane](https://teycirbensoltane.tn)**

*Time-Seal: Where cryptography meets inevitability.*

</div>