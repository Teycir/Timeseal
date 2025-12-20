# Security Penetration Testing Guide

## Overview

This guide provides a comprehensive security testing checklist for Time-Seal before production deployment.

## Prerequisites

```bash
# Install testing tools
npm install -g owasp-zap
npm install -g nuclei
pip install sqlmap
```

## 1. Automated Security Scanning

### OWASP ZAP Scan
```bash
# Start ZAP proxy
zap.sh -daemon -port 8080 -config api.disablekey=true

# Run baseline scan
zap-baseline.py -t https://your-staging-url.workers.dev

# Run full scan
zap-full-scan.py -t https://your-staging-url.workers.dev
```

### Nuclei Vulnerability Scanner
```bash
# Run nuclei scan
nuclei -u https://your-staging-url.workers.dev -t cves/ -t vulnerabilities/
```

## 2. Manual Security Tests

### 2.1 Authentication & Authorization

**Test: Seal Access Control**
```bash
# Try to access seal without Key A
curl https://your-staging-url.workers.dev/api/seal/test-seal-id

# Expected: Should return locked status but not keyB
```

**Test: Rate Limiting**
```bash
# Send 20 requests rapidly
for i in {1..20}; do
  curl -X POST https://your-staging-url.workers.dev/api/create-seal \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}'
done

# Expected: Should receive 429 after 10 requests
```

### 2.2 Input Validation

**Test: File Size Limits**
```bash
# Create 200MB file (exceeds 100MB limit)
dd if=/dev/zero of=large.bin bs=1M count=200

# Try to upload
curl -X POST https://your-staging-url.workers.dev/api/create-seal \
  -F "encryptedBlob=@large.bin" \
  -F "keyB=test" \
  -F "unlockTime=9999999999999"

# Expected: 400 Bad Request with size error
```

**Test: Invalid Unlock Time**
```bash
# Past time
curl -X POST https://your-staging-url.workers.dev/api/create-seal \
  -H "Content-Type: application/json" \
  -d '{"unlockTime": 1000000000000}'

# Expected: 400 Bad Request
```

**Test: SQL Injection**
```bash
# Try SQL injection in seal ID
curl "https://your-staging-url.workers.dev/api/seal/'; DROP TABLE seals;--"

# Expected: 404 or safe error, no SQL execution
```

**Test: XSS Attempts**
```bash
# Try XSS in seal data
curl -X POST https://your-staging-url.workers.dev/api/create-seal \
  -H "Content-Type: application/json" \
  -d '{"keyB":"<script>alert(1)</script>"}'

# Expected: Input sanitized or rejected
```

### 2.3 Cryptographic Security

**Test: Key Strength**
```bash
# Verify key generation entropy
node -e "
const crypto = require('crypto');
const keys = new Set();
for (let i = 0; i < 10000; i++) {
  const bytes = crypto.randomBytes(16);
  keys.add(bytes.toString('hex'));
}
console.log('Unique keys:', keys.size, '/ 10000');
// Expected: 10000 unique keys
"
```

**Test: Encryption Verification**
```bash
# Create seal and verify encryption
# 1. Create seal with known data
# 2. Retrieve encrypted blob
# 3. Verify cannot decrypt without both keys
```

### 2.4 API Security

**Test: CORS Configuration**
```bash
# Test CORS headers
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://your-staging-url.workers.dev/api/create-seal

# Expected: Proper CORS headers or rejection
```

**Test: HTTP Methods**
```bash
# Try unsupported methods
curl -X DELETE https://your-staging-url.workers.dev/api/seal/test-id
curl -X PUT https://your-staging-url.workers.dev/api/seal/test-id

# Expected: 405 Method Not Allowed
```

### 2.5 Storage Security

**Test: R2 Object Lock**
```bash
# Create seal, then try to delete before unlock time
# Via Cloudflare Dashboard or API
# Expected: Deletion should fail (WORM compliance)
```

**Test: Seal Enumeration**
```bash
# Try sequential seal IDs
for i in {1..100}; do
  curl https://your-staging-url.workers.dev/api/seal/$i
done

# Expected: Random IDs should prevent enumeration
```

## 3. Security Checklist

### Critical Security Controls
- [ ] Rate limiting active (10 req/min create, 20 req/min read)
- [ ] Input validation (file size, unlock time, pulse interval)
- [ ] KeyB encrypted at rest with master key
- [ ] Seal IDs cryptographically random (16 bytes)
- [ ] R2 Object Lock enabled (WORM compliance)
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] Audit logging enabled
- [ ] Circuit breaker active

### Vulnerability Tests
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] No authentication bypass
- [ ] No authorization bypass
- [ ] No sensitive data exposure
- [ ] No insecure cryptographic storage
- [ ] No broken access control

### Infrastructure Security
- [ ] Secrets not in code/config
- [ ] Environment variables properly set
- [ ] Database access restricted
- [ ] Storage access restricted
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested

## 4. Automated Security Test Script

```bash
#!/bin/bash
# Run all security tests

echo "🔒 Time-Seal Security Testing"
echo "=============================="

BASE_URL=${1:-"http://localhost:3000"}

# Test 1: Rate Limiting
echo "Test 1: Rate Limiting"
RATE_LIMIT_HITS=0
for i in {1..15}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/create-seal)
  if [ "$STATUS" = "429" ]; then
    RATE_LIMIT_HITS=$((RATE_LIMIT_HITS + 1))
  fi
done
echo "Rate limit triggered: $RATE_LIMIT_HITS times"
[ $RATE_LIMIT_HITS -gt 0 ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 2: Invalid Input
echo ""
echo "Test 2: Invalid Input Rejection"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/create-seal \
  -H "Content-Type: application/json" \
  -d '{"unlockTime": 1000}')
[ "$STATUS" = "400" ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 3: Health Check
echo ""
echo "Test 3: Health Check Endpoint"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
[ "$STATUS" = "200" ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 4: Metrics Endpoint
echo ""
echo "Test 4: Metrics Endpoint"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/metrics)
[ "$STATUS" = "200" ] && echo "✅ PASS" || echo "❌ FAIL"

# Test 5: SQL Injection Protection
echo ""
echo "Test 5: SQL Injection Protection"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/seal/'; DROP TABLE seals;--")
[ "$STATUS" != "500" ] && echo "✅ PASS" || echo "❌ FAIL"

echo ""
echo "Security testing complete!"
```

## 5. Reporting

Document all findings in this format:

```markdown
### Vulnerability: [Name]
**Severity:** Critical/High/Medium/Low
**Description:** [What was found]
**Impact:** [Potential damage]
**Reproduction:** [Steps to reproduce]
**Remediation:** [How to fix]
**Status:** Open/Fixed/Accepted Risk
```

## 6. Sign-off Criteria

Before production deployment:
- [ ] All critical vulnerabilities fixed
- [ ] All high vulnerabilities fixed or accepted
- [ ] Security test suite passing
- [ ] Penetration test report reviewed
- [ ] Security team sign-off obtained
