# TimeSeal Test Suite

Complete test coverage for all TimeSeal shell scripts and infrastructure.

## Quick Start

### Run All Tests
```bash
bash scripts/tests/run-master-tests.sh
```

### Validate Shell Scripts Only
```bash
bash scripts/tests/validate-all.sh
```

### Run API Tests
```bash
# Start dev server
npm run dev

# In another terminal
bash scripts/tests/run-all-tests.sh http://localhost:3000
```

## Test Categories

### 1. Shell Script Validation ✅
**Status:** 100% Coverage (42/42 scripts)

Tests all `.sh` files for:
- Bash syntax correctness
- Executable permissions
- Error handling (`set -e`)
- Proper shebang

**Run:**
```bash
bash scripts/tests/validate-all.sh
```

### 2. API Integration Tests ✅
**Status:** 14 test scripts

Tests all API endpoints:
- Health checks
- Seal creation (TIMED, DEADMAN, EPHEMERAL)
- Seal unlocking
- DMS pulse/burn operations
- Analytics tracking
- QR code generation
- Receipt verification

**Run:**
```bash
bash scripts/tests/run-all-tests.sh http://localhost:3000
```

### 3. Security Tests ✅
**Status:** Automated security suite

Tests:
- Rate limiting
- Input validation
- SQL injection protection
- XSS protection
- CORS configuration
- Unsupported HTTP methods

**Run:**
```bash
bash scripts/security-test.sh http://localhost:3000
```

### 4. Load Tests ⚠️
**Status:** Artillery-based (optional)

Tests:
- Concurrent user simulation
- Performance under load
- Rate limit effectiveness

**Run:**
```bash
bash scripts/tests/load-test.sh http://localhost:3000 100 60
```

### 5. Integration Tests ✅
**Status:** 4 workflow tests

Tests complete workflows:
- DMS create → burn
- DMS create → renew
- DMS create → unlock
- Full DMS lifecycle

**Run:**
```bash
bash tests/integration/dms-complete-workflow.sh
```

## Test Scripts Reference

### Setup & Deployment
| Script | Purpose |
|--------|---------|
| `setup.sh` | Main self-hosting setup |
| `scripts/deploy.sh` | Production deployment |
| `scripts/backup-db.sh` | Database backup |
| `scripts/migrate-prod.sh` | Production migrations |

### Test Runners
| Script | Purpose |
|--------|---------|
| `scripts/tests/run-master-tests.sh` | Run all test suites |
| `scripts/tests/validate-all.sh` | Validate all shell scripts |
| `scripts/tests/run-all-tests.sh` | Run all API tests |
| `scripts/tests/run-shell-tests.sh` | Run shell-specific tests |

### API Tests
| Script | Endpoint Tested |
|--------|-----------------|
| `test-health.sh` | `/api/health` |
| `test-analytics.sh` | `/api/analytics/*` |
| `test-seal-creation.sh` | `/api/create-seal` |
| `test-seal-unlock.sh` | `/api/seal/:id` |
| `test-dms-creation.sh` | `/api/create-seal` (DMS) |
| `test-dms-pulse.sh` | `/api/pulse/:token` |
| `test-dms-burn.sh` | `/api/pulse/:token` (burn) |
| `test-ephemeral-seal.sh` | `/api/create-seal` (ephemeral) |
| `test-qr-code.sh` | `/api/qr-code` |

## Test Results

### Latest Run
```
Total Scripts: 42
Syntax Validation: ✅ 100% PASS
Executable Permissions: ✅ 100% PASS
Error Handling: ✅ 90% (38/42)
```

### Coverage Metrics
- **Shell Scripts:** 100% syntax validated
- **API Endpoints:** 14 test scripts
- **Integration Tests:** 4 workflows
- **Security Tests:** 8 attack vectors

## CI/CD Integration

### GitHub Actions
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install Dependencies
        run: npm install
      - name: Run Tests
        run: bash scripts/tests/run-master-tests.sh
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit
bash scripts/tests/validate-all.sh || exit 1
```

## Dependencies

### Required
- bash
- curl
- jq
- openssl
- npm
- node

### Optional
- wrangler (Cloudflare CLI)
- gpg (canary signing)
- artillery (load testing)

## Troubleshooting

### Script Syntax Errors
```bash
# Check specific script
bash -n scripts/deploy.sh

# Fix permissions
chmod +x scripts/deploy.sh
```

### API Tests Failing
```bash
# Ensure dev server is running
npm run dev

# Check health endpoint
curl http://localhost:3000/api/health
```

### Load Tests Failing
```bash
# Install artillery
npm install -g artillery

# Run with lower concurrency
bash scripts/tests/load-test.sh http://localhost:3000 10 30
```

## Adding New Tests

### 1. Create Test Script
```bash
#!/bin/bash
set -e

API_URL="${1:-http://localhost:3000}"

echo "Testing new feature..."
# Your test code here

echo "✅ Test passed"
```

### 2. Make Executable
```bash
chmod +x scripts/tests/test-new-feature.sh
```

### 3. Add to Test Runner
Edit `scripts/tests/run-all-tests.sh`:
```bash
echo "Test N: New feature"
./test-new-feature.sh "${API_URL}"
```

### 4. Validate
```bash
bash scripts/tests/validate-all.sh
```

## Documentation

- [Shell Script Test Coverage](./SHELL-SCRIPT-TESTS.md)
- [Testing Guide](./TESTING.md)
- [Testing Infrastructure](./TESTING-INFRASTRUCTURE.md)

## Maintenance

### Weekly
- Run full test suite
- Review test reports
- Update coverage metrics

### Monthly
- Review and update test scripts
- Add tests for new features
- Archive old test reports

### Per Release
- Run security tests
- Run load tests
- Generate test report
- Update documentation

## Support

For issues or questions:
- GitHub Issues: https://github.com/teycir/timeseal/issues
- Documentation: docs/TESTING.md
