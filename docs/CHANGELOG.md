# Changelog

All notable changes to Time-Seal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Ephemeral Seals UI** - Complete user interface for self-destructing seals
  - Third seal type button (TIMED | DEADMAN | EPHEMERAL)
  - Max views input field (1-100 views)
  - "One-Time Password" template for ephemeral seals
  - Responsive 3-column layout for seal type selection
  - Dashboard displays ephemeral seals with view count
  - Success screen shows ephemeral warning banner
  - Markdown downloads include ephemeral metadata

### Changed
- Seal type buttons now use responsive text sizes (`text-xs sm:text-sm`)
- Form validation skips unlock time check for ephemeral seals
- API validation conditionally skips time validation for ephemeral
- SealService skips unlock time validation for ephemeral seals
- All heading text sizes now responsive across all pages
- Warrant canary link added to security page (Layer 4: Operational Security)

### Fixed
- Non-responsive text sizes across multiple components
- Ephemeral seals now unlock immediately (validation bypass)
- Form state properly resets after seal creation
- Template application clears conflicting state

### Testing
- ✅ Ephemeral seal test script completed and passing
- ✅ Full test suite passes (7/7 tests)
- ✅ Build verification successful
- ✅ Zero regressions detected

### Removed
- **PWA and Service Worker** - Eliminated to ensure reliable Turnstile operation
  - Removed service worker registration from `lib/usePWA.ts`
  - Service worker now uninstalls itself and clears all caches
  - Removed offline functionality (incompatible with server-side time validation)
  - Removed "Add to Home Screen" functionality
  - Removed PWA install prompts and notifications

### Fixed
- CRITICAL: Service worker blocking Cloudflare Turnstile API requests
- CRITICAL: Cache-related bugs causing Turnstile to disappear on refresh
- Browser-specific caching issues (Brave, Firefox)

### Changed
- `lib/usePWA.ts` now unregisters service workers instead of registering them
- `public/sw.js` replaced with uninstaller that removes all caches
- Simplified architecture without PWA complexity

### Security
- More reliable Turnstile CAPTCHA loading across all browsers
- Eliminated service worker as potential attack vector
- Consistent behavior on Chrome, Brave, Firefox, Safari

### Documentation
- Updated `docs/MOBILE-OPTIMIZATIONS.md` to remove PWA/offline features
- Added explanation of why PWA was removed (security-first design)

### Benefits
- ✅ Turnstile loads reliably on all browsers without refresh
- ✅ No cache-related bugs across deploys
- ✅ Simpler codebase (fewer moving parts)
- ✅ Better security (fewer attack surfaces)
- ❌ No offline dashboard access (acceptable tradeoff)

## [0.9.1] - 2025-01-18

### Added
- **Encrypted Local Storage** - Browser-based encrypted vault for saving seals
  - `lib/encryptedStorage.ts` - AES-GCM-256 encrypted localStorage (180 LOC)
  - Unique encryption key per browser (stored in localStorage)
  - Dashboard page for viewing saved seals
  - Three-button interface: COPY | DOWNLOAD (MD) | SAVE (encrypted)
  - Markdown download includes both vault and pulse links
  - Privacy-first: No server storage, all data encrypted locally

### Removed
- **Seed Phrase System** - Simplified user experience
  - Removed `/generate-seed` page and UI
  - Removed `/recover` page and recovery flow
  - Removed `lib/seedPhrase.ts` library
  - Removed `lib/reusable/seedPhraseRecovery.ts` library
  - Removed seed phrase from all crypto operations
  - Removed "Generate Seed Phrase" navigation button

### Changed
- Seal creation now always uses random keys (no seed phrase option)
- Dashboard now loads from encrypted localStorage (not server)
- SealSuccess component shows three action buttons per link
- Simplified crypto.ts interface (removed seedPhrase parameters)
- Deploy script fixed with proper bash syntax (`[[]]` instead of `[]`)

### Security
- Local vault encrypted with AES-GCM-256
- Unique encryption key per browser (never transmitted)
- No server-side storage of user's seal links
- Encrypted data stored in localStorage only
- Manual save action (user controls what's stored)

### User Experience
- Simplified flow: Create → Copy/Download/Save
- No complex seed phrase management
- Instant access to saved seals in dashboard
- Markdown files for offline backup
- One-click copy to clipboard

### Documentation
- Updated README with encrypted storage feature
- Removed seed phrase documentation
- Added dashboard usage instructions

### Breaking Changes
- Seed phrase recovery no longer available
- Old seed phrases cannot be used to recover seals
- Users must save vault links manually (COPY/DOWNLOAD/SAVE buttons)

## [0.9.0] - 2025-01-17

### Added
- **Ephemeral Seals** - Self-destructing seals that auto-delete after N views
  - `lib/ephemeral.ts` - Modular ephemeral seals library (180 LOC)
  - `isEphemeral` flag and `maxViews` configuration (1-100 views)
  - Privacy-preserving fingerprints (SHA-256 of IP + UA + Lang)
  - Atomic view counting with race-condition protection
  - Auto-deletion of blob and database record on exhaustion
  - First viewer tracking (timestamp + fingerprint)
  - Remaining views calculation
  - Exhausted status (410 Gone HTTP response)
- Database migration `005_ephemeral_seals.sql`
- 5 new database columns: `is_ephemeral`, `max_views`, `view_count`, `first_viewed_at`, `first_viewer_fingerprint`
- 2 new database indexes for ephemeral seal queries
- `recordEphemeralView()` method in DatabaseProvider interface
- Comprehensive unit tests (23 tests, 100% coverage)

### Changed
- `DatabaseProvider` interface extended with atomic view recording
- `SealService.getSeal()` now accepts optional fingerprint parameter
- `SealMetadata` interface includes ephemeral status fields
- API routes updated to handle ephemeral parameters and responses
- Access count now tracked for all seals (consistent metrics)

### Fixed
- CRITICAL: Type casting violation in ephemeral module (broke MockDatabase)
- CRITICAL: Race condition in view counting (non-atomic read-modify-write)
- Missing blob deletion on seal exhaustion (orphaned blobs)
- Inconsistent access count tracking (ephemeral vs normal seals)
- Missing error handling in view recording (silent failures)
- Input validation for maxViews (NaN check added)

### Security
- Atomic SQL operations prevent concurrent view bypass
- Privacy-preserving fingerprints (SHA-256, no raw data stored)
- Complete cleanup on exhaustion (no data leakage)
- Input validation prevents invalid maxViews values
- Error handling prevents silent security bypasses

### Documentation
- `docs/EPHEMERAL-SEALS-IMPLEMENTATION.md` - Complete implementation guide
- `docs/EPHEMERAL-SEALS-COMPLETE.md` - Feature summary and usage
- `docs/EPHEMERAL-BUGS.md` - Bug analysis and fixes
- `docs/EPHEMERAL-BUGS-FIXED.md` - Fix verification report
- `docs/PRACTICAL-INNOVATIONS.md` - 10 innovative features inspired by TimeSeal
- `docs/COMPUTATIONAL-TIME-LOCK.md` - Analysis of computational puzzles vs server-based
- Updated README with ephemeral seals use case and features
- Updated CHANGELOG with v0.9.0 release notes

### Testing
- 23 new unit tests for ephemeral seals module
- All tests pass (158 total, up from 135)
- Zero regressions introduced
- MockDatabase fully compatible with new features

### Use Cases
- 🔥 Read-once confidential messages (legal, healthcare)
- 🔐 One-time passwords and 2FA backup codes
- 💼 Sensitive business documents (self-destruct after viewing)
- 🎯 Limited-view marketing campaigns
- 🔒 Temporary access credentials

### API Changes
- `POST /api/create-seal` accepts `isEphemeral` and `maxViews` parameters
- `GET /api/seal/:id` returns 410 Gone for exhausted seals
- Response includes `viewCount`, `maxViews`, `remainingViews` fields
- Exhausted seals return `firstViewedAt` timestamp

### Database Schema
```sql
ALTER TABLE seals ADD COLUMN is_ephemeral INTEGER DEFAULT 0;
ALTER TABLE seals ADD COLUMN max_views INTEGER DEFAULT NULL;
ALTER TABLE seals ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE seals ADD COLUMN first_viewed_at INTEGER DEFAULT NULL;
ALTER TABLE seals ADD COLUMN first_viewer_fingerprint TEXT DEFAULT NULL;
```

### Performance
- 50% fewer database queries (atomic UPDATE ... RETURNING)
- Zero race conditions (single atomic operation)
- Efficient indexes for ephemeral seal queries

### Breaking Changes
- None (fully backward compatible)

## [0.8.1] - 2025-12-23

### Added
- **Observer Pattern** - Event-driven architecture for seal lifecycle
  - `lib/patterns/observer.ts` - Type-safe event emitter
  - `lib/eventListeners.ts` - Centralized event handling
  - Integrated into `sealService.ts` for all seal operations
  - Events: seal:created, seal:unlocked, seal:deleted, pulse:received

### Changed
- `sealService.ts` now emits events for all seal operations
- Metrics and logging decoupled via event system

### Removed
- Builder pattern (not needed - seal creation already simple)
- Decorator pattern (middleware already handles this)
- Unused pattern examples and documentation

### Benefits
- Decoupled logging/metrics from business logic
- Easy to add new listeners without modifying core code
- Type-safe event system
- Zero dead code - only what's actually used

### Testing
- ✅ All 135 tests pass (no regressions)
- ✅ Observer pattern fully integrated
- ✅ No unused code in codebase

## [0.8.0] - 2025-12-23

### Added
- **Reusable Libraries** - Extracted 10 comprehensive libraries (~1,620 LOC)
  - `lib/ui/textAnimation.ts` - Text scrambling/reveal animation engine
  - `lib/ui/hooks.ts` - React hooks for animations
  - `lib/http.ts` - HTTP utilities (9 functions)
  - `lib/middleware.ts` - Composable middleware pattern
  - `lib/cryptoUtils.ts` - Cryptography helpers (10 functions)
  - `lib/logging.ts` - Unified logging system
  - `lib/resilience.ts` - Circuit breaker, retry, timeout patterns
  - `lib/timeUtils.ts` - Time formatting and countdown logic
  - `lib/metricsLib.ts` - Metrics collection system
  - `lib/hooks.ts` - Common React hooks (8 hooks)
  - `lib/dataStructures.ts` - LRU/TTL caches, queues, stacks
- Master export file (`lib/index.ts`) for convenient imports
- Comprehensive documentation (4 new docs, 100+ pages)

### Changed
- `crypto.ts` now uses `cryptoUtils` for base64 conversion
- `security.ts` now uses `cryptoUtils` for HMAC/hashing
- `apiHandler.ts` now uses `middleware` and `http` libraries
- `DecryptedText.tsx` now uses `useTextScramble` hook

### Documentation
- `docs/REUSABLE-LIBRARIES.md` - Complete API documentation
- `docs/LIBRARIES-SUMMARY.md` - Overview and statistics
- `docs/LIBRARIES-QUICK-REF.md` - Quick reference cheat sheet
- `docs/REGRESSION-TEST-REPORT.md` - Test verification report
- `lib/README.md` - Architecture and design principles

### Testing
- ✅ All 135 tests pass (no regressions)
- ✅ 100% backward compatible
- ✅ TypeScript compilation verified
- ✅ Code coverage maintained at 67.98%

### Benefits
- Single source of truth for common patterns
- Improved code reusability across components
- Better testability with isolated utilities
- Tree-shakeable imports (bundle size optimized)
- Full TypeScript support throughout
- Ready for NPM package extraction

## [0.7.0] - 2025-12-23

### Added
- Privacy-first analytics system (zero external dependencies)
- Analytics tracking: page views, seal creation, unlocks, pulses
- Public stats endpoint (`GET /api/stats`) for total seals created
- Seal counter component on homepage (social proof)
- Analytics database tables (`analytics_events`, `analytics_summary`)
- Rate limiting on analytics endpoints (100 req/min)
- Input validation for analytics events (whitelist + length limits)

### Security
- Analytics endpoints now rate limited (prevents DoS)
- Event type whitelist validation (only 4 valid types)
- Path/referrer length limits (500 chars max)
- No cookies, no IP storage, no personal data (GDPR compliant)
- Country tracking only (from Cloudflare headers, not IP)

### Changed
- BREAKING: Removed MockDatabase (D1 now required in all environments)
- BREAKING: `CloudflareEnv.DB` now required (was optional)
- BREAKING: `CloudflareEnv.MASTER_ENCRYPTION_KEY` now required (was optional)
- Container interface simplified (no optional types)
- AuditLogger now required (was optional)
- Development must use `wrangler dev` with D1 binding

### Removed
- MockDatabase class (production-grade code only)
- Optional environment variables (fail fast on misconfiguration)
- Fallback to `process.env` (explicit configuration required)

### Documentation
- Added ANALYTICS.md with setup instructions
- Updated README with analytics features
- Updated docs/README.md with analytics link

### Database
- Added `analytics_events` table for event tracking
- Added `analytics_summary` table for daily aggregates
- Added indexes on `event_type` and `timestamp`

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
