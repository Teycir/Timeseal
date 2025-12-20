# Tests Directory

This directory contains all test-related files for the TIME-SEAL project.

## Structure

```
tests/
├── config/           # Test configuration files
│   ├── vitest.config.ts
│   ├── vitest.setup.ts
│   └── playwright.config.ts
├── unit/            # Unit tests
│   ├── crypto.test.ts
│   ├── database.test.ts
│   ├── keyEncryption.test.ts
│   ├── security.test.ts
│   ├── storage.test.ts
│   ├── validation.test.ts
│   └── setup.ts
└── e2e/             # End-to-end tests (Playwright)
```

## Running Tests

```bash
# Run all tests with coverage
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run all tests (unit + e2e)
npm run test:all

# Watch mode
npm run test:watch
```

## Test Coverage

Coverage reports are generated in the `/coverage` directory at the project root.

## Configuration

- **Jest**: Configured in `jest.config.js` at project root
- **Vitest**: Configured in `tests/config/vitest.config.ts`
- **Playwright**: Configured in `tests/config/playwright.config.ts`

Symlinks exist at the project root for tool compatibility.
