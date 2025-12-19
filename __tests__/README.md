# Time-Seal Test Suite

Professional-grade testing infrastructure for Time-Seal.

## Stack

- **Jest** - Unit & Integration testing
- **Playwright** - E2E browser testing
- **Testing Library** - React component testing
- **ts-jest** - TypeScript support

## Structure

```
__tests__/
├── unit/           # Unit tests (crypto, utils)
├── integration/    # API integration tests
├── e2e/           # End-to-end browser tests
├── fixtures/      # Mock data
├── mocks/         # Service mocks (D1, R2)
└── setup.ts       # Global test configuration
```

## Commands

```bash
npm test              # Run all unit/integration tests with coverage
npm run test:watch    # Watch mode
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e      # E2E tests (Playwright)
npm run test:e2e:ui   # E2E with UI mode
npm run test:all      # Run everything
```

## Coverage Thresholds

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## CI/CD

Tests run automatically on push/PR via GitHub Actions.
