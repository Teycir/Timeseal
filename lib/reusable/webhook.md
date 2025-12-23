# Reusable Webhook Library

**Location:** `lib/reusable/webhook.ts`

Modular, framework-agnostic webhook notification system with encrypted storage and fire-and-forget delivery.

## Features

✅ **Encrypted Storage** - AES-GCM-256 encryption with random IVs  
✅ **HTTPS-Only** - Automatic validation and rejection of insecure URLs  
✅ **Fire-and-Forget** - No retries, no logs, no state  
✅ **Timeout Protection** - Configurable timeout (default 5s)  
✅ **Zero Dependencies** - Uses native Web Crypto API  
✅ **Framework Agnostic** - Works in any JavaScript environment  

## API Reference

### `encryptWebhook(webhookUrl, key)`

Encrypts webhook URL with AES-GCM key.

```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
const encrypted = await encryptWebhook('https://example.com/hook', key);
// Returns: "base64_iv:base64_ciphertext"
```

**Parameters:**
- `webhookUrl: string` - HTTPS URL to encrypt
- `key: CryptoKey` - AES-GCM key for encryption

**Returns:** `Promise<string>` - Format: `{iv}:{ciphertext}` (both base64)

---

### `decryptWebhook(encryptedWebhook, key)`

Decrypts webhook URL with AES-GCM key.

```typescript
const decrypted = await decryptWebhook(encrypted, key);
// Returns: "https://example.com/hook"
```

**Parameters:**
- `encryptedWebhook: string` - Encrypted webhook in `iv:ciphertext` format
- `key: CryptoKey` - AES-GCM key for decryption

**Returns:** `Promise<string>` - Decrypted webhook URL

**Throws:** Error if decryption fails (wrong key, corrupted data)

---

### `validateWebhookUrl(url)`

Validates webhook URL (HTTPS only).

```typescript
validateWebhookUrl('https://example.com/hook'); // true
validateWebhookUrl('http://insecure.com/hook'); // false
validateWebhookUrl('not-a-url'); // false
```

**Parameters:**
- `url: string` - URL to validate

**Returns:** `boolean` - True if valid HTTPS URL

---

### `fireWebhook(webhookUrl, payload, timeoutMs?)`

Fires webhook with JSON payload (fire-and-forget).

```typescript
await fireWebhook('https://example.com/hook', {
  event: 'seal_unlocked',
  sealId: 'abc123',
  unlockedAt: '2024-01-15T12:00:00Z',
});
```

**Parameters:**
- `webhookUrl: string` - HTTPS URL to POST to
- `payload: WebhookPayload` - JSON payload to send
- `timeoutMs?: number` - Timeout in milliseconds (default: 5000)

**Returns:** `Promise<void>` - Always resolves (errors silently ignored)

**Behavior:**
- Validates HTTPS before firing
- Sends POST request with `Content-Type: application/json`
- Aborts after timeout
- Silently ignores all errors (network, timeout, validation)

---

### `decryptAndFireWebhook(encryptedWebhook, keyB, payload)`

Convenience function: decrypt + validate + fire in one call.

```typescript
await decryptAndFireWebhook(
  'base64_iv:base64_ciphertext',
  'base64_key',
  { event: 'seal_unlocked', sealId: 'abc123' }
);
```

**Parameters:**
- `encryptedWebhook: string` - Encrypted webhook in `iv:ciphertext` format
- `keyB: string` - Base64-encoded AES-GCM key
- `payload: WebhookPayload` - JSON payload to send

**Returns:** `Promise<void>` - Always resolves (errors silently ignored)

---

## Usage Examples

### Basic Encryption/Decryption

```typescript
import { encryptWebhook, decryptWebhook } from '@/lib/reusable/webhook';

// Generate key
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

// Encrypt
const encrypted = await encryptWebhook('https://hooks.zapier.com/test', key);
console.log(encrypted); // "A1B2C3D4E5F6G7H8:X9Y8Z7W6V5U4T3S2..."

// Decrypt
const decrypted = await decryptWebhook(encrypted, key);
console.log(decrypted); // "https://hooks.zapier.com/test"
```

### Fire Webhook with Custom Payload

```typescript
import { fireWebhook } from '@/lib/reusable/webhook';

await fireWebhook('https://discord.com/api/webhooks/...', {
  event: 'seal_unlocked',
  sealId: 'abc123',
  unlockedAt: new Date().toISOString(),
  metadata: {
    isDMS: false,
    accessCount: 1,
  },
});
```

### Complete Workflow (Encrypt → Store → Decrypt → Fire)

```typescript
import {
  encryptWebhook,
  decryptAndFireWebhook,
} from '@/lib/reusable/webhook';

// 1. User provides webhook URL
const userWebhookUrl = 'https://hooks.slack.com/services/...';

// 2. Encrypt with seal's keyB (client-side)
const keyB = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
const encrypted = await encryptWebhook(userWebhookUrl, keyB);

// 3. Store encrypted webhook in database
await db.createSeal({
  id: 'seal123',
  encryptedWebhook: encrypted,
  // ... other fields
});

// 4. On unlock, decrypt and fire (server-side)
const seal = await db.getSeal('seal123');
const keyBBase64 = '...'; // Retrieved from seal
await decryptAndFireWebhook(seal.encryptedWebhook, keyBBase64, {
  event: 'seal_unlocked',
  sealId: seal.id,
  unlockedAt: new Date().toISOString(),
});
```

### Integration with TimeSeal

```typescript
// In crypto.ts
import { encryptWebhook } from './reusable/webhook';

export async function encryptData(
  data: string | File,
  options?: { webhookUrl?: string }
): Promise<EncryptionResult> {
  // ... generate keys ...
  
  let encryptedWebhook: string | undefined;
  if (options?.webhookUrl) {
    encryptedWebhook = await encryptWebhook(options.webhookUrl, keyB);
  }
  
  return { encryptedBlob, keyA, keyB, iv, encryptedWebhook };
}
```

```typescript
// In sealService.ts
import { decryptAndFireWebhook } from './reusable/webhook';

async getSeal(sealId: string): Promise<SealMetadata> {
  // ... unlock logic ...
  
  if (seal.encryptedWebhook) {
    decryptAndFireWebhook(
      seal.encryptedWebhook,
      decryptedKeyB,
      {
        event: 'seal_unlocked',
        sealId,
        unlockedAt: new Date().toISOString(),
      }
    ).catch(() => {}); // Fire-and-forget
  }
  
  return metadata;
}
```

## Security Considerations

### Encryption
- Uses AES-GCM-256 (authenticated encryption)
- Random IV per encryption (prevents pattern analysis)
- IV prepended to ciphertext (standard practice)

### Validation
- HTTPS-only enforcement (rejects HTTP, FTP, etc.)
- URL parsing via native `URL()` constructor
- Invalid URLs fail silently (no error leakage)

### Privacy
- Webhook URL never stored in plaintext
- Never logged or visible in responses
- Fire-and-forget (no retry logs)
- Errors silently ignored (no debugging info)

### Timeout
- Default 5-second timeout
- Uses `AbortSignal.timeout()` (native API)
- Prevents hanging workers/threads

## Testing

```bash
# Run webhook library tests
npm run test:unit -- webhook-library.test.ts

# Coverage report
npm run test -- --coverage lib/reusable/webhook.ts
```

## Use Cases Beyond TimeSeal

### 1. Encrypted Notification System
```typescript
// Store encrypted notification endpoints per user
const encrypted = await encryptWebhook(userWebhookUrl, userKey);
await db.users.update({ id: userId, encryptedWebhook: encrypted });

// Fire on events
await decryptAndFireWebhook(user.encryptedWebhook, userKey, {
  event: 'order_shipped',
  orderId: '12345',
});
```

### 2. Secure Callback URLs
```typescript
// OAuth callback URLs
const encrypted = await encryptWebhook(callbackUrl, sessionKey);
await redis.set(`oauth:${state}`, encrypted, 'EX', 600);

// On OAuth return
const encrypted = await redis.get(`oauth:${state}`);
await decryptAndFireWebhook(encrypted, sessionKey, {
  event: 'oauth_complete',
  code: authCode,
});
```

### 3. Dead Man's Switch Notifications
```typescript
// Store emergency contact webhooks
const encrypted = await encryptWebhook(emergencyWebhook, masterKey);

// Fire if user doesn't check in
if (lastCheckIn + interval < Date.now()) {
  await decryptAndFireWebhook(encrypted, masterKey, {
    event: 'emergency_trigger',
    userId: user.id,
    lastSeen: lastCheckIn,
  });
}
```

## Performance

- **Encryption**: ~2ms per URL (AES-GCM native)
- **Decryption**: ~2ms per URL
- **Validation**: <1ms (URL parsing)
- **Fire**: 50-500ms (network dependent)
- **Memory**: ~100 bytes per encrypted URL

## Limitations

- HTTPS only (by design)
- No retry logic (fire-and-forget)
- No webhook verification (user controls endpoint)
- No custom headers (JSON POST only)
- No response handling (fire-and-forget)

## Future Enhancements

Possible additions without breaking changes:

- `fireWebhookWithRetry()` - Optional retry logic
- `validateWebhookSignature()` - HMAC verification
- `encryptWebhookWithMetadata()` - Store metadata with URL
- `batchFireWebhooks()` - Fire multiple webhooks in parallel

## License

Same as TimeSeal (Business Source License)
