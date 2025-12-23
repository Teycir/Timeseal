# Changelog

All notable changes to Time-Seal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.2] - 2025-12-23

### Fixed
- CRITICAL: Race condition in pulse token validation (nonce now checked first)
- CRITICAL: Non-atomic pulse updates (combined into single database operation)
- CRITICAL: Data loss risk in seal deletion (database deleted before blob)
- File size limit mismatch (aligned to 750KB across all layers)
- Access count inflation (only increments on successful unlock)
- Rate limit fingerprint collisions (now using SHA-256 hash)
- Memory leak in concurrent request tracker (added cleanup mechanism)
- Malformed pulse token crashes (strict format validation added)

### Security
- Nonce validation now atomic and checked before token signature
- Pulse updates are all-or-nothing (prevents inconsistent database state)
- Deletion order reversed (database first, then blob)
- Token format strictly validated (seal ID, timestamp, nonce, signature)
- Fingerprints hashed with SHA-256 (prevents truncation collisions)
- Concurrent tracker auto-cleanup at 10K entries (prevents memory exhaustion)

### Changed
- File upload limit reduced from 5MB to 750KB (D1 column limit)
- Access count now only increments on unlock (not on locked checks)
- Database interface extended with atomic update methods
- Rate limit fingerprinting now async (due to SHA-256 hashing)

### Added
- `updatePulseAndUnlockTime()` method for atomic pulse updates
- `incrementAccessCount()` method for separate access tracking
- Strict regex validation for pulse token components
- Memory leak protection in concurrent request tracker
- SHA-256 fingerprint hashing for collision resistance

### Documentation
- Added SECURITY-REVIEW.md with comprehensive issue analysis
- Added SECURITY-FIXES.md with implementation details
- Added SECURITY-SUMMARY.md with executive summary
- Updated README with v0.6.2 security features and defense layers

## [0.6.1] - 2025-01-16

### Fixed
- CRITICAL: Dead Man's Switch pulse bug (500 error on second pulse)
- CRITICAL: Pulse token URL encoding (404 errors with special characters)
- Public pulse URL security leak (removed from vault page)
- Nonce validation DoS vulnerability (reordered after token validation)
- Pulse interval calculation (removed incorrect 1000x multiplier)
- Transaction safety in seal creation and burn operations
- MockDatabase consistency with production behavior
- Dropdown styling (blue highlight replaced with neon green)

### Added
- Comprehensive error logging with ErrorLogger utility
- Collapsible debug panels in UI for error details
- New pulse token generation after each successful pulse
- URL encoding for pulse tokens in all display contexts
- Transaction rollback mechanisms for database operations
- Enhanced warrant canary page with detailed explanations
- Input validation for pulse interval (1-30 days)

### Removed
- Admin canary update endpoint (incompatible with Cloudflare Workers)
- Admin canary management page (unnecessary, auto-generates)
- Public pulse URL display from vault page (security risk)

### Security
- Pulse tokens now properly URL-encoded to prevent routing exploits
- Nonce validation moved after signature validation (prevents DoS)
- Private pulse URLs no longer exposed on public vault page
- Enhanced error context without leaking sensitive information

### Documentation
- Enhanced warrant canary page with comprehensive explanations
- Updated README with warrant canary documentation
- Added conversation summary documenting all fixes

## [0.6.0] - 2025-01-15

### Added
- Memory protection for Key A (XOR obfuscation in browser memory)
- Browser extension detection and warnings
- Built-in warrant canary at /canary (auto-updating)
- Security dashboard with real-time alerts
- Self-hosting guide for infrastructure independence
- Multi-party time attestation (external time source verification)
- Comprehensive hardening documentation
- Admin interface for canary management
- GitHub Actions workflow for monthly canary reminders
- Transparency report template

### Security
- Key A now obfuscated in memory to prevent casual inspection
- Extension detection warns users about potential memory access
- Warrant canary provides legal coercion detection
- Time attestation verifies Cloudflare time against external sources
- Self-hosting option eliminates infrastructure trust dependency

### Documentation
- HARDENING.md - Complete threat mitigation guide
- SELF-HOSTING.md - Deployment instructions for own infrastructure
- TRANSPARENCY-REPORT-TEMPLATE.md - Quarterly legal disclosure template
- HARDENING-SETUP.md - Quick setup guide

### Threat Mitigation
- Browser extension/malware memory access (detection + obfuscation)
- Cloudflare infrastructure compromise (canary + time attestation)
- Legal coercion (warrant canary + transparency)

## [0.5.1] - 2025-12-22

### Fixed
- CRITICAL: HKDF salt randomization bug (made all seals undecryptable)
- Client-side pulse token generation removed (server-only now)
- Time check ordering in seal service (prevents timing attacks)

### Security
- HKDF now uses deterministic zero salt for reproducible key derivation
- Pulse tokens fully server-generated with HMAC signatures
- Time validation happens before decryption operations

## [0.5.0] - 2025-12-22

### Added
- Cryptographic receipts with HMAC-SHA256 signatures
- Receipt download functionality (JSON format)
- Receipt verification API endpoint
- Seal statistics (access count tracking)
- Custom unlock messages (shown after unlock)
- Auto-expiration (configurable days after unlock)
- Blob hash preview (SHA-256, visible before unlock)
- DB-backed rate limiting (persistent across workers)
- DB-backed nonce storage (replay protection)
- Browser fingerprinting for rate limits (IP + UA + Lang)
- Timing attack mitigation (random jitter 0-100ms)
- UTF-8 validation on decrypted content

### Fixed
- CRITICAL: Pulse interval bug (1000x multiplier removed)
- Serverless state vulnerabilities (moved to D1 database)
- Rate limit bypass via IP rotation (fingerprinting added)
- Replay attacks across worker instances (DB nonces)

### Security
- Rate limits now persist in D1 database
- Nonces stored in D1 for distributed replay protection
- Timing attacks prevented with response jitter
- Decryption integrity validation added
- Cryptographic receipts for tamper detection

### Database
- Added `blob_hash` column for content verification
- Added `unlock_message` column for custom messages
- Added `expires_at` column for auto-expiration
- Added `access_count` column for statistics
- Added `rate_limits` table for persistent rate limiting
- Added `nonces` table for replay protection

## [0.4.0] - 2025-12-22

### Added
- HTTP method validation on all endpoints
- Request origin validation
- Concurrent request limiting (5 per IP)
- Suspicious pattern detection (sequential seal IDs)
- Seal age validation (2 year maximum)

### Security
- Method-based access control (GET/POST only)
- Origin header validation
- Concurrent request tracking and limiting
- Sequential access pattern detection
- Enhanced logging for suspicious activity

## [0.3.0] - 2025-12-22

### Added
- Request size validation (30MB limit)
- Seal ID format validation (32 hex characters)
- Key format validation (base64, length checks)
- Timestamp validation (prevent overflow)
- IP address validation (IPv4/IPv6)
- Honeypot seals for enumeration detection
- User-agent logging in audit trail

### Security
- Enhanced input validation across all API endpoints
- Honeypot IDs: 00000000... and ffffffff...
- Improved audit logging with user-agent tracking

## [0.2.0] - 2025-12-22

### Added

- Mobile-responsive UI across all pages
- Responsive typography with Tailwind breakpoints (sm/md/lg)
- Adaptive padding and spacing for mobile devices
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

## [0.1.0] - 2025-12-15

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

[Unreleased]: https://github.com/teycir/timeseal/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/teycir/timeseal/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/teycir/timeseal/releases/tag/v0.1.0
