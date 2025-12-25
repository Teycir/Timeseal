# Testing Infrastructure

Test setup and configuration for TimeSeal.

## Test Environment

### Local Development
```bash
npm run dev
npm run test
```

### Test Database
Uses in-memory SQLite for unit tests. No D1 connection required.

### Mock Services
- Mock Cloudflare Turnstile
- Mock encryption keys
- Mock time functions

## Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # API endpoint tests
└── e2e/            # End-to-end user flows
```

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

## Test Data

Test seals are automatically cleaned up after each test run.

## Performance Testing

```bash
# Load testing
npm run test:load

# Stress testing
npm run test:stress
```

## Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- tests/unit/crypto.test.ts
```
