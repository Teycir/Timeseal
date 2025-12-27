# Security Enhancements

Additional security features and best practices for TimeSeal.

## Implemented Enhancements

### 1. File Size Limits
- Maximum upload: 750KB
- Enforced at UI, API, and database layers
- Prevents DoS via large uploads

### 2. Integrity Verification
- SHA-256 hash of encrypted blob
- Stored in database and receipt
- Detects tampering or corruption

### 3. Rate Limiting
- SHA-256 fingerprinting (IP + UA + Lang)
- Database-backed tracking
- Prevents brute force and DoS

### 4. Replay Attack Prevention
- Cryptographic nonces for pulse tokens
- Database-backed nonce storage
- Prevents token reuse

### 5. Input Validation
- Strict type checking
- Sanitization of all inputs
- Prevents injection attacks

## Recommended Enhancements

### 1. Content Security Policy (CSP)
Add strict CSP headers to prevent XSS.

### 2. Subresource Integrity (SRI)
Use SRI for external scripts/styles.

### 3. HSTS Headers
Enforce HTTPS with strict transport security.

### 4. API Key Authentication (Optional)
For high-security deployments, add API key requirement.

## Self-Hosting Recommendations

- Use Cloudflare Access for admin endpoints
- Enable DDoS protection
- Configure custom rate limits
- Set up monitoring and alerts
