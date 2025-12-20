# Changelog

All notable changes to Time-Seal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Professional test suite with Jest, Playwright, and Testing Library
- Unit tests for crypto library (key generation, encryption/decryption)
- Integration tests for API endpoints (seal creation, status checks)
- E2E tests for complete seal workflows with fixtures
- Mock fixtures for Cloudflare services (D1, R2)
- GitHub Actions CI/CD workflow for automated testing
- Test coverage thresholds (80% across all metrics)
- Test documentation in `__tests__/README.md`
- SECURITY.md documenting threat model and mitigations
- Rate limiting middleware for API protection
- Centralized error handling with user-friendly messages
- TODO.md tracking production readiness tasks
- Storage abstraction layer (R2 vs Mock)
- Input validation with size and time constraints
- Structured logging for audit trails
- Key encryption for keyB database storage
- Metrics endpoint for monitoring (/api/metrics)
- Health check endpoint (/api/health)
- Circuit breaker pattern with retry logic
- Reusable UI components (Button, Input, Countdown)
- .env.example documenting required configuration
- Database schema (schema.sql) for D1

### Refactoring
- Service layer abstraction (SealService) for business logic
- Database abstraction layer with factory pattern
- API handler abstraction with composable middleware
- Custom React hooks for reusable UI logic
- Utility functions library for common operations
- Configuration management with validation
- Dependency injection container for testability
- ARCHITECTURE.md documenting design patterns

### Implemented
- ✅ Rate limiting integrated into API routes (10-20 req/min)
- ✅ Cryptographically random seal IDs (16-byte)
- ✅ R2 Object Lock metadata configuration
- ✅ E2E test fixtures and mocking
- ✅ Metrics and health check endpoints

### Fixed
- Tailwind border color definition added
- Crypto tests now test actual encryption/decryption functions
- Mock storage separated from production code
- API routes refactored with service layer
- E2E tests fixed with proper fixtures

### Security
- keyB now encrypted before database storage
- Master key derived from environment secrets
- Audit logging for all seal operations
- Rate limiting prevents DOS attacks
- Input validation prevents malicious uploads

### Known Issues
- No rate limiting on API endpoints (implementation ready, needs deployment)
- No authentication required for seal access
- Key A visible in browser history via URL hash
- Seal ID enumeration possible without obfuscation
- R2 Object Lock integration incomplete
- Playwright E2E tests need debugging

## [0.1.0] - 2024-01-XX

### Added
- Initial release of Time-Seal
- Cryptographically enforced time-locked vault system
- Split-key architecture (Key A + Key B)
- Cloudflare R2 Object Lock integration (WORM compliance)
- Cloudflare D1 database for metadata storage
- Dead Man's Switch functionality with pulse mechanism
- AES-GCM encryption using Web Crypto API
- Next.js 14 frontend with App Router
- Tailwind CSS cipher-punk themed UI
- Countdown timer for locked seals
- Automatic unlock at specified time
- Public vault links with hash-based Key A
- Private pulse links for DMS resets

### Security
- Zero-trust architecture
- Client-side encryption
- Server cannot decrypt without user's Key A
- Immutable storage prevents early access
- No single point of failure

[Unreleased]: https://github.com/teycir/timeseal/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/teycir/timeseal/releases/tag/v0.1.0
