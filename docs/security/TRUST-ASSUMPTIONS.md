# Trust Assumptions

What you must trust to use TimeSeal securely.

## Infrastructure Trust

### ✅ You MUST Trust:

1. **Cloudflare Workers**
   - Executes time-lock enforcement
   - Stores encrypted Key B
   - Cannot be bypassed without infrastructure access

2. **Cloudflare D1 Database**
   - Stores encrypted blobs and keys
   - Database encryption at rest
   - Access controlled by Cloudflare

3. **HTTPS/TLS**
   - Protects vault links in transit
   - Prevents man-in-the-middle attacks
   - Relies on certificate authorities

4. **Web Crypto API**
   - Browser's native encryption implementation
   - AES-GCM-256 cryptographic operations
   - Random number generation

### ❌ You DO NOT Trust:

1. **TimeSeal Operator**
   - Cannot decrypt without Key A (in your URL)
   - Cannot unlock early (time enforced by Cloudflare)
   - Can see encrypted blobs only

2. **Your Local Clock**
   - Irrelevant to unlock time
   - Server time is authoritative

3. **Other Users**
   - No access to your seals without vault link
   - Cryptographically isolated

## Cryptographic Trust

### ✅ You MUST Trust:

1. **AES-GCM-256**
   - Industry-standard encryption
   - No known practical attacks
   - NIST-approved algorithm

2. **SHA-256**
   - Collision-resistant hashing
   - Used for fingerprinting and integrity

3. **HMAC-SHA256**
   - Message authentication
   - Pulse token signatures

### ❌ You DO NOT Trust:

1. **Brute Force**
   - 2^256 key space (computationally infeasible)
   - Would take billions of years

## Operational Trust

### ✅ You MUST Trust:

1. **Your Browser**
   - Executes JavaScript correctly
   - Protects Key A in memory
   - No malicious extensions

2. **Your Device Security**
   - No keyloggers or malware
   - Secure storage of vault links
   - Physical security

3. **Network Security**
   - HTTPS connection integrity
   - No compromised DNS
   - No malicious proxies

### ❌ You DO NOT Trust:

1. **Server Logs**
   - Key A never logged (stays in URL hash)
   - IP addresses hashed
   - Minimal data retention

## Threat Model

### Protected Against:

✅ Operator attempting early unlock  
✅ Database breach (encryption at rest)  
✅ Man-in-the-middle attacks (HTTPS)  
✅ Brute force attacks (rate limiting)  
✅ Replay attacks (nonce validation)  
✅ Time manipulation (server-side enforcement)  

### NOT Protected Against:

❌ Compromised browser/device  
❌ Vault link theft (treat like password)  
❌ Cloudflare infrastructure compromise  
❌ Quantum computing (future threat)  
❌ $5 wrench attack (physical coercion)  

## Reducing Trust

### Self-Hosting
Deploy your own instance to eliminate trust in third-party operator.

See [SELF-HOSTING.md](SELF-HOSTING.md)

### Open Source
Audit the code yourself to verify security claims.

GitHub: https://github.com/teycir/timeseal

### Warrant Canary
Monitor transparency status for compromise signals.

Live: https://timeseal.dev/canary
