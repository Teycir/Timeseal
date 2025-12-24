// Shared Constants
// Centralized configuration to avoid duplication

// File Size Limits
export const MAX_FILE_SIZE = 750 * 1024; // 750KB (D1 TEXT limit with base64 overhead)
export const MAX_FILE_SIZE_BEFORE_ENCRYPTION = Math.floor(MAX_FILE_SIZE / 1.34); // ~560KB (accounts for base64 33% overhead)
export const MAX_REQUEST_SIZE = 1 * 1024 * 1024; // 1MB
export const MAX_DECOMPRESSED_SIZE = 10 * 1024 * 1024; // 10MB (zip bomb protection)

// Time Limits
export const MAX_DURATION_DAYS = 30; // Maximum seal duration
export const MIN_UNLOCK_DELAY = 60 * 1000; // 1 minute
export const MIN_PULSE_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const MAX_PULSE_INTERVAL = 30 * 24 * 3600 * 1000; // 30 days
export const NONCE_EXPIRY = 300000; // 5 minutes
export const PULSE_TOKEN_WINDOW = 300000; // 5 minutes

// Rate Limits
export const RATE_LIMIT_CREATE_SEAL = { limit: 10, window: 60000 }; // 10/min
export const RATE_LIMIT_GET_SEAL = { limit: 20, window: 60000 }; // 20/min
export const RATE_LIMIT_PULSE = { limit: 20, window: 60000 }; // 20/min
export const RATE_LIMIT_BURN = { limit: 10, window: 60000 }; // 10/min
export const RATE_LIMIT_QR = { limit: 10, window: 60000 }; // 10/min
export const RATE_LIMIT_ANALYTICS = { limit: 100, window: 60000 }; // 100/min
export const RATE_LIMIT_STATS = { limit: 100, window: 60000 }; // 100/min

// Concurrent Requests
export const MAX_CONCURRENT_REQUESTS = 5;
export const MAX_CONCURRENT_TRACKER_ENTRIES = 10000;

// Encoding
export const BASE64_CHUNK_SIZE = 8192; // Prevent stack overflow

// Honeypots (expanded set for better detection)
export const HONEYPOT_IDS = [
  '00000000000000000000000000000000',
  'ffffffffffffffffffffffffffffffff',
  '11111111111111111111111111111111',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'deadbeefdeadbeefdeadbeefdeadbeef',
  'cafebabecafebabecafebabecafebabe',
  '12345678901234567890123456789012',
  'abcdefabcdefabcdefabcdefabcdefab'
];

// Allowed Origins - Use getAppConfig() from appConfig.ts instead
// These are fallback defaults only
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
