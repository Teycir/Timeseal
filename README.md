<div align="center">

# ⏳ TIME-SEAL
### The Unbreakable Protocol

![License](https://img.shields.io/badge/license-BSL-neon_green?style=for-the-badge)
![Encryption](https://img.shields.io/badge/Encryption-AES--GCM-neon_green?style=for-the-badge)
![Storage](https://img.shields.io/badge/Storage-R2_Object_Lock-neon_green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Operational-neon_green?style=for-the-badge)

```text
████████╗██╗███╗   ███╗███████╗    ███████╗███████╗ █████╗ ██╗
╚══██╔══╝██║████╗ ████║██╔════╝    ██╔════╝██╔════╝██╔══██╗██║
   ██║   ██║██╔████╔██║█████╗█████╗███████╗█████╗  ███████║██║
   ██║   ██║██║╚██╔╝██║██╔══╝╚════╝╚════██║██╔══╝  ██╔══██║██║
   ██║   ██║██║ ╚═╝ ██║███████╗    ███████║███████╗██║  ██║███████╗
   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═╝╚══════╝
```

### *"If I go silent, this speaks for me."*

[Create a Seal](http://localhost:3000) · [View Architecture](#-architecture) · [Report Bug](https://github.com/teycir/timeseal/issues)

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

### 🔒 Layer 1: The Vault (R2 Object Lock)
> **Immutable Storage**
Files are stored in Cloudflare R2 with **WORM Compliance** (Write Once, Read Many). This prevents deletion—even by the admin—until the unlock time expires.

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
    participant R2_Storage

    Note over User, Browser: Phase A: Sealing
    User->>Browser: Enters Secret + Time
    Browser->>Browser: Generate Key A + Key B
    Browser->>Browser: Encrypt Secret (Key A + Key B)
    Browser->>API: Send EncryptedBlob + Key B + Time
    API->>R2_Storage: Upload Blob (Object Lock)
    API->>D1_DB: Store Key B + Time
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

## � Tech Stack

*   **Frontend:** `Next.js 14` (App Router)
*   **Runtime:** `Cloudflare Workers`
*   **Database:** `Cloudflare D1` (SQLite)
*   **Storage:** `Cloudflare R2` (Object Lock)
*   **Crypto:** `Web Crypto API` (Native AES-GCM)
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

---

## 📚 Documentation

- [Architecture Guide](ARCHITECTURE.md) - Design patterns and abstractions
- [Deployment Guide](DEPLOYMENT.md) - Cloudflare setup instructions
- [Security Documentation](SECURITY.md) - Threat model and security controls
- [Security Testing](SECURITY-TESTING.md) - Penetration testing guide
- [Testing Guide](TESTING.md) - Complete testing documentation
- [Changelog](CHANGELOG.md) - Version history and changes
- [TODO](TODO.md) - Remaining tasks and roadmap

This project is licensed under the **Business Source License (BSL)**.

- **Free for non-commercial use**
- **Commercial use requires license**
- **Source code available for inspection**
- **Converts to Apache 2.0 after 4 years**

See [LICENSE](LICENSE) for full terms.

---

## 🔮 Future Roadmap

- [ ] **Multi-Sig Unlocking**: Require M-of-N keys to open.
- [ ] **Decentralized Storage**: Backup blobs to Arweave/IPFS.
- [ ] **Hardware Key Support**: Integration with YubiKey for Pulse.

---

<div align="center">

**Built with 💚 and 🔒**

*Time-Seal: Where cryptography meets inevitability.*

</div>