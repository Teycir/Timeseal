# TimeSeal Libraries - Quick Reference

## 🚀 Quick Import Guide

```typescript
// Import everything (not recommended for production)
import * as TimeSeal from '@/lib';

// Import specific utilities (recommended)
import { jsonResponse, errorResponse } from '@/lib/http';
import { useCountdown, useCopyToClipboard } from '@/lib/hooks';
import { formatDuration, CountdownTimer } from '@/lib/timeUtils';
import { logger } from '@/lib/logging';
import { CircuitBreaker, withRetry } from '@/lib/resilience';
```

## 📚 Common Use Cases

### 1. Create API Endpoint
```typescript
import { createHandler, jsonResponse } from '@/lib/apiHandler';
import { logger } from '@/lib/logging';

export const POST = createHandler(async (ctx) => {
  logger.info('Request received', { ip: ctx.ip });
  return jsonResponse({ success: true });
});
```

### 2. Add Countdown Timer
```typescript
import { useCountdown } from '@/lib/hooks';
import { formatDuration } from '@/lib/timeUtils';

function Timer({ unlockTime }) {
  const { timeRemaining, isUnlocked } = useCountdown(unlockTime);
  return <div>{formatDuration(timeRemaining)}</div>;
}
```

### 3. Add Text Animation
```typescript
import { useTextScramble } from '@/lib/ui/hooks';

function Title() {
  const { displayText, scramble } = useTextScramble('Hello World');
  return <h1 onMouseEnter={scramble}>{displayText}</h1>;
}
```

### 4. Add Retry Logic
```typescript
import { withRetry } from '@/lib/resilience';

const data = await withRetry(
  () => fetch('/api/data').then(r => r.json()),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### 5. Add Caching
```typescript
import { LRUCache } from '@/lib/dataStructures';

const cache = new LRUCache<string, any>(100);
cache.set('key', 'value');
const value = cache.get('key');
```

### 6. Track Metrics
```typescript
import { trackSealCreated, metrics } from '@/lib/metricsLib';

trackSealCreated();
console.log(metrics.getWithRates());
```

### 7. Hash Data
```typescript
import { sha256, hmacSign } from '@/lib/cryptoUtils';

const hash = await sha256('data');
const signature = await hmacSign('message', 'secret');
```

### 8. Copy to Clipboard
```typescript
import { useCopyToClipboard } from '@/lib/hooks';

function CopyButton({ text }) {
  const [copy, copied] = useCopyToClipboard();
  return (
    <button onClick={() => copy(text)}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
```

## 🎯 Function Reference

### HTTP (`lib/http.ts`)
| Function | Purpose | Example |
|----------|---------|---------|
| `jsonResponse(data, options?)` | Create JSON response | `jsonResponse({ ok: true })` |
| `errorResponse(msg, status?)` | Create error response | `errorResponse('Not found', 404)` |
| `parseJSON<T>(request)` | Parse request body | `const data = await parseJSON(req)` |
| `getClientIP(request)` | Extract client IP | `const ip = getClientIP(req)` |

### Time (`lib/timeUtils.ts`)
| Function | Purpose | Example |
|----------|---------|---------|
| `formatDuration(ms, opts?)` | Format milliseconds | `formatDuration(90000)` → "1m 30s" |
| `parseMilliseconds(ms)` | Parse to components | `const { days, hours } = parseMilliseconds(ms)` |
| `getTimeRemaining(unlock)` | Get remaining time | `const ms = getTimeRemaining(unlockTime)` |
| `isUnlocked(unlock)` | Check if unlocked | `if (isUnlocked(unlockTime)) { ... }` |

### Crypto (`lib/cryptoUtils.ts`)
| Function | Purpose | Example |
|----------|---------|---------|
| `sha256(data)` | SHA-256 hash | `const hash = await sha256('text')` |
| `hmacSign(data, secret)` | HMAC signature | `const sig = await hmacSign(data, key)` |
| `hmacVerify(data, sig, secret)` | Verify HMAC | `const valid = await hmacVerify(...)` |
| `generateRandomString(len)` | Random string | `const id = generateRandomString(16)` |

### Logging (`lib/logging.ts`)
| Method | Purpose | Example |
|--------|---------|---------|
| `logger.info(msg, ctx?)` | Info log | `logger.info('User login', { userId })` |
| `logger.error(msg, err?, ctx?)` | Error log | `logger.error('Failed', err, { id })` |
| `logger.audit(event, ctx?)` | Audit log | `logger.audit('seal_created', { id })` |
| `logger.child(ctx)` | Child logger | `const child = logger.child({ req })` |

### Resilience (`lib/resilience.ts`)
| Function/Class | Purpose | Example |
|----------------|---------|---------|
| `CircuitBreaker` | Prevent cascading failures | `breaker.execute(() => fetch(...))` |
| `withRetry(fn, config?)` | Retry with backoff | `withRetry(() => api(), { maxRetries: 3 })` |
| `withTimeout(promise, ms)` | Add timeout | `withTimeout(fetch(...), 5000)` |

### React Hooks (`lib/hooks.ts`)
| Hook | Purpose | Example |
|------|---------|---------|
| `useCountdown(time, opts?)` | Countdown timer | `const { timeRemaining } = useCountdown(t)` |
| `useDebounce(value, delay)` | Debounce value | `const debounced = useDebounce(search, 500)` |
| `useLocalStorage(key, init)` | localStorage sync | `const [val, set] = useLocalStorage('k', 0)` |
| `useCopyToClipboard()` | Copy to clipboard | `const [copy, copied] = useCopyToClipboard()` |

### Data Structures (`lib/dataStructures.ts`)
| Class | Purpose | Example |
|-------|---------|---------|
| `LRUCache<K,V>` | LRU cache | `cache.set(key, val); cache.get(key)` |
| `TTLCache<K,V>` | TTL cache | `cache.set(key, val, 60000)` |
| `RateLimitBucket` | Token bucket | `if (bucket.tryConsume()) { ... }` |
| `Queue<T>` | FIFO queue | `queue.enqueue(item); queue.dequeue()` |

## 🎨 UI Components

### Text Animation
```typescript
import { useTextScramble } from '@/lib/ui/hooks';

const { displayText, scramble } = useTextScramble('Text', {
  speed: 50,
  maxIterations: 10,
  animateOn: 'hover', // or 'view'
});
```

### Countdown Display
```typescript
import { useCountdown } from '@/lib/hooks';
import { parseMilliseconds } from '@/lib/timeUtils';

const { timeRemaining } = useCountdown(unlockTime);
const { days, hours, minutes, seconds } = parseMilliseconds(timeRemaining);
```

## 🔧 Configuration Examples

### Logger with Redaction
```typescript
import { createLogger, LogLevel } from '@/lib/logging';

const logger = createLogger({
  minLevel: LogLevel.INFO,
  redactPaths: ['password', 'apiKey', 'secret'],
  enableAudit: true,
});
```

### Circuit Breaker
```typescript
import { CircuitBreaker } from '@/lib/resilience';

const breaker = new CircuitBreaker({
  threshold: 5,        // Open after 5 failures
  timeout: 60000,      // 60s operation timeout
  resetTimeout: 30000, // Try again after 30s
});
```

### Metrics Collector
```typescript
import { MetricsCollector } from '@/lib/metricsLib';

const metrics = new MetricsCollector({
  enableRates: true,
  rateWindow: 3600000, // 1 hour
});
```

## 💡 Pro Tips

1. **Tree Shaking**: Import directly from specific files for smaller bundles
   ```typescript
   // ✅ Good
   import { jsonResponse } from '@/lib/http';
   
   // ❌ Avoid
   import { jsonResponse } from '@/lib';
   ```

2. **Type Safety**: All libraries are fully typed
   ```typescript
   const cache = new LRUCache<string, User>(100);
   ```

3. **Composition**: Combine libraries for powerful patterns
   ```typescript
   const resilientFetch = createResilientOperation(
     () => fetch(url),
     circuitBreaker,
     { maxRetries: 3 }
   );
   ```

4. **Testing**: All utilities are pure functions (easy to test)
   ```typescript
   expect(formatDuration(90000)).toBe('1m 30s');
   ```

## 📖 Full Documentation

- **Complete API**: See `docs/REUSABLE-LIBRARIES.md`
- **Summary**: See `docs/LIBRARIES-SUMMARY.md`
- **Examples**: See `app/components/ExampleComponent.tsx`
- **Tests**: See `tests/unit/reusable-libraries.test.ts`
