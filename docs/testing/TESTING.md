# Testing & Deployment Guide

## Quick Start

```bash
# 1. Setup Cloudflare Infrastructure
./scripts/setup-cloudflare.sh

# 2. Run Security Tests
./scripts/security-test.sh https://your-staging-url.workers.dev

# 3. Run Load Tests
k6 run scripts/load-test.js -e BASE_URL=https://your-staging-url.workers.dev
```

## 1. Cloudflare Infrastructure Setup

### Prerequisites
- Cloudflare account
- Wrangler CLI installed
- OpenSSL installed

### Setup Steps
```bash
./scripts/setup-cloudflare.sh
```

This script will:
1. Login to Cloudflare
2. Create R2 bucket with Object Lock
3. Create D1 database
4. Run schema migrations
5. Generate and set master encryption key
6. Create wrangler.toml configuration
7. Deploy to staging

### Manual Steps Required
- Enable Object Lock on R2 bucket via Dashboard
- Verify retention settings
- Test staging deployment

## 2. Load Testing

### Install k6
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Run Load Tests
```bash
# Basic load test
k6 run scripts/load-test.js

# With custom URL
k6 run scripts/load-test.js -e BASE_URL=https://your-staging-url.workers.dev

# Spike test (sudden traffic increase)
k6 run scripts/load-test.js --stage 0s:0,10s:1000,20s:0

# Stress test (find breaking point)
k6 run scripts/load-test.js --stage 2m:100,5m:200,2m:300,5m:400
```

### Expected Results
- **Response Time (p95):** < 500ms
- **Error Rate:** < 1%
- **Throughput:** > 100 req/s
- **Rate Limiting:** Triggers at configured thresholds

## 3. Security Testing

### Automated Tests
```bash
# Run full security test suite
./scripts/security-test.sh https://your-staging-url.workers.dev

# Results saved to security-test-results.txt
```

### Manual Security Review
Follow the comprehensive guide in `SECURITY-TESTING.md`:
- Input validation tests
- Authentication/authorization tests
- Cryptographic security tests
- API security tests
- Storage security tests

### Security Checklist
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] KeyB encrypted at rest
- [ ] Seal IDs cryptographically random
- [ ] R2 Object Lock enabled
- [ ] Audit logging active

## 4. Unit & Integration Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests
npm run test:e2e
```

### Expected Coverage
- **Crypto Library:** 97.6%
- **Overall:** > 80%
- **All Tests:** 21/21 passing

## 5. Deployment Workflow

### Staging Deployment
```bash
# Deploy to staging
wrangler deploy --env staging

# Test staging
./scripts/security-test.sh https://timeseal-staging.workers.dev
k6 run scripts/load-test.js -e BASE_URL=https://timeseal-staging.workers.dev

# Monitor logs
wrangler tail --env staging
```

### Production Deployment
```bash
# Final checks
npm test
npm run build

# Deploy to production
wrangler deploy

# Monitor
wrangler tail

# Check health
curl https://timeseal.workers.dev/api/health
curl https://timeseal.workers.dev/api/metrics
```

### Rollback
```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [deployment-id]
```

## 6. Monitoring

### Health Check
```bash
curl https://your-url.workers.dev/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "version": "0.1.0",
  "services": {
    "storage": "closed",
    "database": "operational"
  }
}
```

### Metrics
```bash
curl https://your-url.workers.dev/api/metrics
```

Expected response:
```json
{
  "sealsCreated": 100,
  "sealsUnlocked": 50,
  "pulsesReceived": 25,
  "failedUnlocks": 2,
  "uptimeMs": 3600000,
  "rates": {
    "sealsPerHour": 100,
    "unlocksPerHour": 50
  }
}
```

### Cloudflare Analytics
- Workers Analytics: Request metrics
- R2 Analytics: Storage usage
- D1 Analytics: Database queries

## 7. Troubleshooting

### Common Issues

**Issue: Rate limiting not working**
```bash
# Check configuration
grep RATE_LIMIT wrangler.toml

# Test manually
for i in {1..15}; do curl -X POST https://your-url/api/create-seal; done
```

**Issue: Database connection failed**
```bash
# Verify D1 binding
wrangler d1 list

# Test query
wrangler d1 execute timeseal-db --command "SELECT COUNT(*) FROM seals"
```

**Issue: R2 storage errors**
```bash
# Verify R2 bucket
wrangler r2 bucket list

# Check Object Lock
# Go to Cloudflare Dashboard > R2 > Bucket > Settings
```

## 8. Performance Benchmarks

### Target Metrics
- **Seal Creation:** < 200ms (p95)
- **Seal Retrieval:** < 100ms (p95)
- **Health Check:** < 50ms (p95)
- **Throughput:** > 100 req/s
- **Error Rate:** < 0.1%

### Optimization Tips
- Enable Cloudflare caching for static assets
- Use D1 indexes for frequent queries
- Tune circuit breaker thresholds
- Monitor R2 request patterns

## 9. Sign-off Checklist

Before production launch:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Load tests passing
- [ ] Security tests passing
- [ ] Staging deployment successful
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Documentation complete
- [ ] Team sign-off obtained
