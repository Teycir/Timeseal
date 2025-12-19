# ⏳ TIME-SEAL: The Unbreakable Protocol

**"If I go silent, this speaks for me."**

A cryptographically enforced time-locked vault system built on Cloudflare's edge infrastructure.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Time-Seal in action.

## 🏗️ Architecture

### Layer 1: The Vault (R2 Object Lock)
- **Immutable Storage** using Cloudflare R2
- **WORM Compliance** prevents deletion until unlock time
- Files are cryptographically locked at the infrastructure level

### Layer 2: The Handshake (Split-Key Crypto)
- **Key A**: Stored in URL hash (client-side only)
- **Key B**: Stored in D1 database with unlock timestamp
- **AES-GCM Encryption** using Web Crypto API
- Server refuses to release Key B until time expires

### Layer 3: The Pulse (Dead Man's Switch)
- Private pulse URLs for extending lock time
- Automatic unlock if creator goes silent
- Perfect for whistleblowing and inheritance scenarios

## 🔧 Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 with Object Lock
- **Crypto**: Web Crypto API (AES-GCM)
- **Styling**: Tailwind CSS (Cipher-punk theme)

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── create-seal/     # Vault creation endpoint
│   │   ├── seal/[id]/       # Status check & key release
│   │   └── pulse/[token]/   # Dead man's switch pulse
│   ├── v/[id]/              # Vault viewer page
│   └── page.tsx             # Landing page
├── lib/
│   ├── crypto.ts            # Split-key encryption
│   ├── database.ts          # D1 database utilities
│   └── types.ts             # TypeScript definitions
└── components/              # Reusable UI components
```

## 🔐 Security Features

- **Zero-Trust Architecture**: Server never sees unencrypted data
- **Split-Key Encryption**: Requires both client and server keys
- **WORM Storage**: Immutable until unlock time
- **Edge Computing**: No single point of failure
- **Client-Side Crypto**: Encryption happens in browser

## 🎯 Use Cases

### The Crypto Holder
"I have my seed phrase in a Time-Seal. If I die, it unlocks for my wife. If I'm alive, I reset the timer."

### The Whistleblower  
"I have evidence. If I am arrested and can't click the reset button, the evidence goes public automatically."

### The Marketer
"I'm dropping a limited edition product. The link is public now, but nobody can buy until the timer hits zero."

## 🚀 Deployment

### Local Development
The app runs with mock implementations for R2 and D1. All crypto operations work fully.

### Production (Cloudflare)
1. Deploy to Cloudflare Pages
2. Enable D1 database
3. Enable R2 with Object Lock
4. Configure environment variables

## 🎨 Design Philosophy

**Cipher-Punk Aesthetic**: Black backgrounds, neon green text, monospace fonts. The UI should feel like a secure terminal from a cyberpunk movie.

**Minimal Complexity**: Every feature serves the core mission. No bloat, no unnecessary dependencies.

**Viral by Design**: The locked vault page includes a "Create your own Time-Seal" button, creating natural viral growth.

---

*Time-Seal: Where cryptography meets inevitability.*