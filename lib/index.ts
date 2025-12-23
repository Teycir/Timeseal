/**
 * TimeSeal Reusable Libraries - Master Index
 * 
 * This file provides a single entry point for all reusable libraries.
 * Import from here for convenience, or import directly from specific files for tree-shaking.
 */

// UI & Animation
export * from './ui';
export { TextScrambler, createRevealAnimation, DEFAULT_CYBER_CHARS } from './ui/textAnimation';
export { useTextScramble, useRevealAnimation } from './ui/hooks';

// HTTP Utilities
export {
  jsonResponse,
  errorResponse,
  successResponse,
  parseJSON,
  getClientIP,
  corsHeaders,
  corsResponse,
  optionsResponse,
} from './http';

// Middleware
export {
  compose,
  createMiddleware,
  chain,
  type Context,
  type Handler,
  type Middleware,
} from './middleware';

// Cryptography
export {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  generateAESKey,
  deriveKey,
  sha256,
  hmacSign,
  hmacVerify,
  generateRandomBytes,
  generateRandomString,
} from './cryptoUtils';

// Logging
export {
  UnifiedLogger,
  createLogger,
  logger,
  LogLevel,
  type LogContext,
  type LogEntry,
  type LoggerConfig,
} from './logging';

// Resilience
export {
  CircuitBreaker,
  CircuitState,
  withTimeout,
  withRetry,
  createResilientOperation,
  type CircuitBreakerConfig,
  type RetryConfig,
} from './resilience';

// Time Utilities
export {
  parseMilliseconds,
  formatDuration,
  formatTime,
  formatTimeShort,
  formatTimestamp,
  formatRelativeTime,
  getTimeRemaining,
  isUnlocked,
  addDuration,
  CountdownTimer,
  type TimeComponents,
  type FormatOptions,
} from './timeUtils';

// Metrics
export {
  MetricsCollector,
  metrics,
  MetricKeys,
  trackSealCreated,
  trackSealUnlocked,
  trackSealAccessed,
  trackPulseReceived,
  trackFailedUnlock,
  trackRateLimitHit,
  trackError,
  type MetricValue,
  type MetricsSnapshot,
  type MetricsConfig,
} from './metricsLib';

// React Hooks
export {
  useCountdown,
  useInterval,
  useDebounce,
  useThrottle,
  useLocalStorage,
  useAsync,
  useCopyToClipboard,
  type UseCountdownOptions,
  type UseIntervalOptions,
} from './hooks';

// Data Structures
export {
  LRUCache,
  TTLCache,
  RateLimitBucket,
  Queue,
  Stack,
} from './dataStructures';

// Re-export commonly used utilities
export { cn } from './utils';

// Design Patterns
export * from './patterns';
