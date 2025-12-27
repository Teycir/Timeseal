# TimeSeal Reusable Libraries

This document describes the extracted reusable libraries from the TimeSeal project.

## 📚 Library Structure

```
lib/
├── ui/                      # UI Component Libraries
│   ├── textAnimation.ts     # Text scrambling/reveal animations
│   ├── hooks.ts            # React hooks for animations
│   └── index.ts            # UI exports
├── http.ts                 # HTTP utilities
├── middleware.ts           # Middleware composition
├── cryptoUtils.ts          # Cryptography utilities
├── logging.ts              # Unified logging system
├── resilience.ts           # Circuit breaker, retry, timeout
├── timeUtils.ts            # Time formatting and countdown
├── metricsLib.ts           # Metrics collection
├── hooks.ts                # React hooks (countdown, async, etc.)
├── dataStructures.ts       # LRU cache, TTL cache, queues
└── [existing files...]
```

## 🎨 UI Libraries

### Text Animation (`lib/ui/textAnimation.ts`)

Reusable text scrambling and reveal animations.

**Classes:**
- `TextScrambler` - Configurable text scrambling engine
- `createRevealAnimation` - Factory for reveal animations

**Usage:**
```typescript
import { TextScrambler, createRevealAnimation } from '@/lib/ui/textAnimation';

// Basic scrambling
const scrambler = new TextScrambler({ speed: 50, maxIterations: 10 });
scrambler.scramble('Hello World', (text) => console.log(text));

// Reveal animation
const animate = createRevealAnimation('Secret Message', 1.5);
animate((text) => setDisplayText(text));
```

### React Hooks (`lib/ui/hooks.ts`)

React hooks for text animations.

**Hooks:**
- `useTextScramble(text, config)` - Hook for text scrambling
- `useRevealAnimation(text, duration)` - Hook for reveal animation

**Usage:**
```typescript
import { useTextScramble, useRevealAnimation } from '@/lib/ui/hooks';

function MyComponent() {
  const { displayText, scramble } = useTextScramble('Hello', {
    speed: 50,
    animateOn: 'hover'
  });
  
  return <span onMouseEnter={scramble}>{displayText}</span>;
}
```

## 🌐 HTTP Utilities (`lib/http.ts`)

Reusable HTTP response and request utilities.

**Functions:**
- `jsonResponse(data, options)` - Create JSON response
- `errorResponse(message, status)` - Create error response
- `successResponse(data)` - Create success response
- `parseJSON<T>(request)` - Parse JSON from request
- `getClientIP(request)` - Extract client IP
- `corsHeaders(origin)` - Generate CORS headers
- `corsResponse(response, origin)` - Add CORS to response
- `optionsResponse(origin)` - Create OPTIONS response

**Usage:**
```typescript
import { jsonResponse, errorResponse, parseJSON } from '@/lib/http';

// In API route
export async function POST(request: Request) {
  const data = await parseJSON<{ name: string }>(request);
  
  if (!data.name) {
    return errorResponse('Name required', 400);
  }
  
  return jsonResponse({ success: true, name: data.name });
}
```

## 🔗 Middleware (`lib/middleware.ts`)

Composable middleware pattern for request handling.

**Types:**
- `Context` - Request context interface
- `Handler` - Request handler type
- `Middleware` - Middleware function type

**Functions:**
- `compose(...middlewares)` - Compose multiple middlewares
- `createMiddleware(fn)` - Create middleware from function
- `chain(...handlers)` - Chain handlers together

**Usage:**
```typescript
import { compose, createMiddleware, type Handler } from '@/lib/middleware';

const logger = createMiddleware(async (ctx, next) => {
  console.log('Request:', ctx.request.url);
  return next(ctx);
});

const auth = createMiddleware(async (ctx, next) => {
  if (!ctx.request.headers.get('Authorization')) {
    return new Response('Unauthorized', { status: 401 });
  }
  return next(ctx);
});

const handler: Handler = async (ctx) => {
  return new Response('Success');
};

const app = compose(logger, auth);
```

## 🔐 Crypto Utilities (`lib/cryptoUtils.ts`)

Reusable cryptography functions.

**Functions:**
- `arrayBufferToBase64(buffer)` - Convert ArrayBuffer to base64
- `base64ToArrayBuffer(base64)` - Convert base64 to ArrayBuffer
- `generateAESKey(length)` - Generate AES key
- `deriveKey(password, salt, iterations)` - Derive key from password
- `sha256(data)` - SHA-256 hash
- `hmacSign(data, secret)` - HMAC signature
- `hmacVerify(data, signature, secret)` - Verify HMAC
- `generateRandomBytes(length)` - Generate random bytes
- `generateRandomString(length)` - Generate random string

**Usage:**
```typescript
import { sha256, hmacSign, hmacVerify } from '@/lib/cryptoUtils';

// Hash data
const hash = await sha256('sensitive data');

// Sign and verify
const signature = await hmacSign('message', 'secret');
const valid = await hmacVerify('message', signature, 'secret');
```

## 🔄 Migration Guide

### Before (DecryptedText.tsx)
```typescript
const [displayText, setDisplayText] = useState(text);
const intervalRef = useRef<NodeJS.Timeout | null>(null);

const scramble = useCallback(() => {
  // 50+ lines of scrambling logic
}, [text, speed, maxIterations]);
```

### After (DecryptedText.tsx)
```typescript
import { useTextScramble } from '@/lib/ui/hooks';

const { displayText, scramble } = useTextScramble(text, {
  speed,
  maxIterations,
  animateOn,
});
```

### Before (security.ts)
```typescript
export async function generatePulseToken(sealId: string, secret: string) {
  const data = `${sealId}:${Date.now()}:${crypto.randomUUID()}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(/* ... */);
  const signature = await crypto.subtle.sign(/* ... */);
  // 10+ lines
}
```

### After (security.ts)
```typescript
import { hmacSign } from '@/lib/cryptoUtils';

export async function generatePulseToken(sealId: string, secret: string) {
  const data = `${sealId}:${Date.now()}:${crypto.randomUUID()}`;
  const signature = await hmacSign(data, secret);
  return `${data}:${signature}`;
}
```

## ✅ Benefits

1. **Code Reusability** - Use across multiple components/routes
2. **Maintainability** - Single source of truth for common patterns
3. **Testability** - Easier to unit test isolated utilities
4. **Type Safety** - Full TypeScript support
5. **Tree Shaking** - Only import what you need
6. **Documentation** - Centralized API documentation

## 🚀 Usage in Project

All libraries are already integrated into the TimeSeal codebase:

- ✅ `DecryptedText.tsx` uses `useTextScramble`
- ✅ `crypto.ts` uses `cryptoUtils`
- ✅ `security.ts` uses `cryptoUtils`
- ✅ `apiHandler.ts` uses `middleware` and `http`

## 📦 Potential NPM Packages

These libraries could be extracted into standalone NPM packages:

1. **@timeseal/text-animations** - UI text animation library
2. **@timeseal/crypto-utils** - Web Crypto API utilities
3. **@timeseal/http-utils** - HTTP response utilities
4. **@timeseal/middleware** - Composable middleware pattern
5. **@timeseal/logging** - Unified logging for Workers
6. **@timeseal/resilience** - Circuit breaker & retry patterns
7. **@timeseal/time-utils** - Time formatting & countdown
8. **@timeseal/metrics** - Metrics collection
9. **@timeseal/react-hooks** - Common React hooks
10. **@timeseal/data-structures** - LRU/TTL caches

## 📦 Complete Library Index

### Core Libraries
1. **UI Libraries** (`lib/ui/`) - Text animations, React hooks
2. **HTTP Utilities** (`lib/http.ts`) - Request/response helpers
3. **Middleware** (`lib/middleware.ts`) - Composable middleware
4. **Crypto Utilities** (`lib/cryptoUtils.ts`) - Encryption helpers
5. **Logging** (`lib/logging.ts`) - Unified logging system
6. **Resilience** (`lib/resilience.ts`) - Circuit breaker, retry
7. **Time Utils** (`lib/timeUtils.ts`) - Time formatting, countdown
8. **Metrics** (`lib/metricsLib.ts`) - Metrics collection
9. **React Hooks** (`lib/hooks.ts`) - Common React patterns
10. **Data Structures** (`lib/dataStructures.ts`) - Caches, queues

## 🔮 Future Enhancements

- [ ] Add more animation patterns (typewriter, glitch, matrix)
- [ ] Add encryption/decryption helpers
- [ ] Add request validation middleware
- [ ] Add caching middleware
- [ ] Add rate limiting middleware integration
- [ ] Add comprehensive unit tests for all utilities
- [ ] Extract to NPM packages
- [ ] Add performance benchmarks


## 📝 Logging Library (`lib/logging.ts`)

Unified logging system with redaction and audit support.

**Classes:**
- `UnifiedLogger` - Main logger class with level filtering

**Usage:**
```typescript
import { createLogger, LogLevel } from '@/lib/logging';

const logger = createLogger({
  minLevel: LogLevel.INFO,
  redactPaths: ['password', 'secret'],
  enableAudit: true,
});

logger.info('User logged in', { userId: '123' });
logger.error('Failed to process', new Error('Timeout'));
logger.audit('seal_created', { sealId: 'abc', ip: '1.2.3.4' });

// Child logger with inherited context
const childLogger = logger.child({ component: 'API' });
childLogger.info('Request received');
```

## 🔄 Resilience Library (`lib/resilience.ts`)

Circuit breaker, retry, and timeout patterns.

**Classes:**
- `CircuitBreaker` - Prevents cascading failures
- `withRetry` - Retry with exponential backoff
- `withTimeout` - Add timeout to promises

**Usage:**
```typescript
import { CircuitBreaker, withRetry, createResilientOperation } from '@/lib/resilience';

// Circuit breaker
const breaker = new CircuitBreaker({ threshold: 5, timeout: 60000 });
const result = await breaker.execute(() => fetchData());

// Retry with exponential backoff
const data = await withRetry(() => apiCall(), {
  maxRetries: 3,
  baseDelay: 1000,
  exponential: true,
});

// Combined resilience
const resilientOp = createResilientOperation(
  () => fetchData(),
  breaker,
  { maxRetries: 3 }
);
```

## ⏰ Time Utilities (`lib/timeUtils.ts`)

Time formatting, parsing, and countdown logic.

**Functions:**
- `formatDuration(ms, options)` - Format milliseconds
- `formatTime(ms)` - Short format (1d 2h 3m)
- `parseMilliseconds(ms)` - Parse to components
- `CountdownTimer` - Countdown timer class

**Usage:**
```typescript
import { formatDuration, parseMilliseconds, CountdownTimer } from '@/lib/timeUtils';

// Format duration
const formatted = formatDuration(90000); // "1 minute 30 seconds"
const short = formatDuration(90000, { short: true }); // "1m 30s"

// Parse components
const { days, hours, minutes } = parseMilliseconds(86400000);

// Countdown timer
const timer = new CountdownTimer(Date.now() + 60000);
timer.onChange((remaining) => console.log(remaining));
timer.onUnlock(() => console.log('Unlocked!'));
timer.start();
```

## 📊 Metrics Library (`lib/metricsLib.ts`)

Metrics collection with rates and snapshots.

**Classes:**
- `MetricsCollector` - Collect and track metrics

**Usage:**
```typescript
import { metrics, trackSealCreated, MetricKeys } from '@/lib/metricsLib';

// Track events
trackSealCreated();
metrics.increment(MetricKeys.SEALS_UNLOCKED);

// Get snapshot
const snapshot = metrics.getSnapshot();
const withRates = metrics.getWithRates();

// Reset specific metric
metrics.reset(MetricKeys.ERRORS);
```

## 🪝 React Hooks (`lib/hooks.ts`)

Common React hooks for various patterns.

**Hooks:**
- `useCountdown(unlockTime, options)` - Countdown timer
- `useInterval(callback, delay)` - Interval with cleanup
- `useDebounce(value, delay)` - Debounce value
- `useThrottle(value, limit)` - Throttle value
- `useLocalStorage(key, initial)` - localStorage sync
- `useAsync(asyncFn, immediate)` - Async state management
- `useCopyToClipboard()` - Copy to clipboard

**Usage:**
```typescript
import { useCountdown, useDebounce, useCopyToClipboard } from '@/lib/hooks';

function MyComponent() {
  // Countdown
  const { timeRemaining, isUnlocked } = useCountdown(unlockTime, {
    onComplete: () => console.log('Done!'),
  });

  // Debounce
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);

  // Copy to clipboard
  const [copy, copied] = useCopyToClipboard();
  
  return (
    <button onClick={() => copy('text')}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

## 🗂️ Data Structures (`lib/dataStructures.ts`)

Common data structures for caching and queuing.

**Classes:**
- `LRUCache<K, V>` - Least Recently Used cache
- `TTLCache<K, V>` - Time-To-Live cache
- `RateLimitBucket` - Token bucket rate limiter
- `Queue<T>` - FIFO queue
- `Stack<T>` - LIFO stack

**Usage:**
```typescript
import { LRUCache, TTLCache, RateLimitBucket } from '@/lib/dataStructures';

// LRU Cache
const cache = new LRUCache<string, any>(100);
cache.set('key', 'value');
const value = cache.get('key');

// TTL Cache
const ttlCache = new TTLCache<string, any>(60000); // 1 minute default
ttlCache.set('key', 'value', 30000); // 30 seconds
const cached = ttlCache.get('key');

// Rate limit bucket
const bucket = new RateLimitBucket(10, 1); // 10 tokens, 1 per second
if (bucket.tryConsume(1)) {
  // Allow request
}
```

## 🔗 Integration Examples

### Example 1: API Route with All Libraries

```typescript
import { createHandler, compose, withLogging, withErrorHandling } from '@/lib/apiHandler';
import { jsonResponse, errorResponse } from '@/lib/http';
import { withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logging';
import { trackSealCreated } from '@/lib/metricsLib';

export const POST = createHandler(async (ctx) => {
  logger.info('Creating seal', { ip: ctx.ip });
  
  const result = await withRetry(
    () => createSeal(data),
    { maxRetries: 3 }
  );
  
  trackSealCreated();
  
  return jsonResponse({ sealId: result.id });
});
```

### Example 2: React Component with Hooks

```typescript
import { useCountdown, useDebounce, useCopyToClipboard } from '@/lib/hooks';
import { formatDuration } from '@/lib/timeUtils';
import { useTextScramble } from '@/lib/ui/hooks';

function SealViewer({ unlockTime }: { unlockTime: number }) {
  const { timeRemaining, isUnlocked } = useCountdown(unlockTime);
  const { displayText, scramble } = useTextScramble('TIME-SEAL');
  const [copy, copied] = useCopyToClipboard();
  
  return (
    <div>
      <h1 onMouseEnter={scramble}>{displayText}</h1>
      {!isUnlocked && <p>{formatDuration(timeRemaining)}</p>}
      <button onClick={() => copy(window.location.href)}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
}
```

### Example 3: Resilient Database Operation

```typescript
import { CircuitBreaker, withRetry } from '@/lib/resilience';
import { logger } from '@/lib/logging';
import { LRUCache } from '@/lib/dataStructures';

const breaker = new CircuitBreaker({ threshold: 5 });
const cache = new LRUCache<string, any>(1000);

async function getSeal(id: string) {
  // Check cache first
  const cached = cache.get(id);
  if (cached) return cached;
  
  // Resilient database fetch
  const seal = await breaker.execute(() =>
    withRetry(() => db.getSeal(id), { maxRetries: 3 })
  );
  
  cache.set(id, seal);
  logger.info('Seal fetched', { sealId: id });
  
  return seal;
}
```
