# Security Testing Guide

Penetration testing and security validation procedures for TimeSeal.

## Test Categories

### 1. Cryptographic Tests

**Test: Key A Never Sent to Server**
```bash
# Monitor network traffic while creating seal
# Verify URL hash (#KeyA) never appears in requests
```

**Test: Encryption Strength**
```bash
# Attempt to decrypt blob without keys
# Should be computationally infeasible
```

### 2. Time-Lock Tests

**Test: Clock Manipulation**
```bash
# Change local system time
# Verify seal remains locked (server time is authoritative)
```

**Test: Concurrent Access**
```bash
# Multiple simultaneous unlock attempts
# Verify atomic operations prevent race conditions
```

### 3. Rate Limiting Tests

**Test: Brute Force Protection**
```bash
# Rapid seal creation attempts
# Should be rate limited after threshold
```

**Test: IP Rotation Bypass**
```bash
# Attempt rate limit bypass with VPN/proxy
# Fingerprinting should detect and block
```

### 4. Injection Tests

**Test: SQL Injection**
```bash
# Inject SQL in seal content/metadata
# Should be sanitized and escaped
```

**Test: XSS Injection**
```bash
# Inject JavaScript in seal content
# Should render as plain text, not execute
```

### 5. Replay Attack Tests

**Test: Pulse Token Reuse**
```bash
# Capture pulse token and replay
# Should be rejected (nonce validation)
```

## Automated Testing

```bash
npm run test:security
```

## Bug Bounty

Report security vulnerabilities to: security@timeseal.dev

## Responsible Disclosure

- 90-day disclosure window
- Credit in security advisories
- No legal action for good-faith research
