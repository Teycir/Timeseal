# TimeSeal API Documentation

## Base URL
```
Production: https://timeseal.online
Development: http://localhost:3000
```

## Authentication
No authentication required. All endpoints are public.

## Rate Limiting
- **Seal Creation**: 10 requests/minute per IP
- **Seal Access**: 20 requests/minute per IP
- **Pulse Operations**: 20 requests/minute per IP

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `Retry-After`: Seconds until rate limit resets (on 429 response)

---

## Endpoints

### 1. Create Seal

**POST** `/api/create-seal`

Creates a new time-locked seal with encrypted content.

#### Request
**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `encryptedBlob` | Blob | Yes | Encrypted content (max 25MB) |
| `keyB` | string | Yes | Server-side encryption key (base64) |
| `iv` | string | Yes | Initialization vector (base64) |
| `unlockTime` | string | Yes | Unix timestamp (milliseconds) |
| `isDMS` | string | No | "true" for Dead Man's Switch |
| `pulseInterval` | string | No | Milliseconds between pulses (DMS only) |
| `pulseToken` | string | No | UUID for pulse authentication (DMS only) |
| `cf-turnstile-response` | string | Yes | Turnstile CAPTCHA token |

#### Response (200 OK)
```json
{
  "success": true,
  "publicUrl": "/v/abc123def456",
  "pulseToken": "uuid-v4-token"
}
```

#### Error Responses
- **400 Bad Request**: Invalid input or validation failure
- **413 Payload Too Large**: File exceeds 25MB
- **429 Too Many Requests**: Rate limit exceeded

#### Example
```bash
curl -X POST https://timeseal.online/api/create-seal \
  -F "encryptedBlob=@encrypted.bin" \
  -F "keyB=base64encodedkey" \
  -F "iv=base64encodediv" \
  -F "unlockTime=1735689600000" \
  -F "isDMS=false" \
  -F "cf-turnstile-response=token"
```

---

### 2. Get Seal Status

**GET** `/api/seal/{id}`

Retrieves seal status and encrypted content. Returns Key B only if unlocked.

#### Parameters
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | string | Path | Seal ID (32 hex characters) |

#### Response (200 OK - Locked)
```json
{
  "id": "abc123def456",
  "isLocked": true,
  "unlockTime": 1735689600000,
  "timeRemaining": 86400000
}
```

#### Response (200 OK - Unlocked)
```json
{
  "id": "abc123def456",
  "isLocked": false,
  "unlockTime": 1735689600000,
  "keyB": "base64encodedkey",
  "iv": "base64encodediv",
  "encryptedBlob": "base64encryptedcontent"
}
```

#### Error Responses
- **404 Not Found**: Seal does not exist
- **429 Too Many Requests**: Rate limit exceeded

#### Example
```bash
curl https://timeseal.online/api/seal/abc123def456
```

---

### 3. Send Pulse (Dead Man's Switch)

**POST** `/api/pulse`

Resets the unlock timer for a Dead Man's Switch seal.

#### Request
**Content-Type**: `application/json`

```json
{
  "pulseToken": "uuid-v4-token"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "newUnlockTime": 1735776000000
}
```

#### Error Responses
- **400 Bad Request**: Invalid pulse token
- **404 Not Found**: Seal not found or not a DMS
- **429 Too Many Requests**: Rate limit exceeded

#### Example
```bash
curl -X POST https://timeseal.online/api/pulse \
  -H "Content-Type: application/json" \
  -d '{"pulseToken":"uuid-v4-token"}'
```

---

### 4. Get Pulse Status

**POST** `/api/pulse/status`

Retrieves current status of a Dead Man's Switch seal.

#### Request
**Content-Type**: `application/json`

```json
{
  "pulseToken": "uuid-v4-token"
}
```

#### Response (200 OK)
```json
{
  "timeRemaining": 86400000,
  "pulseInterval": 604800000
}
```

#### Error Responses
- **400 Bad Request**: Invalid pulse token
- **404 Not Found**: Seal not found
- **429 Too Many Requests**: Rate limit exceeded

---

### 5. Burn Seal

**POST** `/api/burn`

Permanently destroys a Dead Man's Switch seal (irreversible).

#### Request
**Content-Type**: `application/json`

```json
{
  "pulseToken": "uuid-v4-token"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Seal burned successfully"
}
```

#### Error Responses
- **400 Bad Request**: Invalid pulse token
- **404 Not Found**: Seal not found or not a DMS
- **429 Too Many Requests**: Rate limit exceeded

---

### 6. Get Audit Log

**GET** `/api/audit/{id}`

Retrieves immutable audit log for a seal.

#### Parameters
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `id` | string | Path | Seal ID (32 hex characters) |

#### Response (200 OK)
```json
{
  "sealId": "abc123def456",
  "events": [
    {
      "timestamp": 1735689600000,
      "eventType": "SEAL_CREATED",
      "ip": "192.168.1.1",
      "metadata": {
        "isDMS": false,
        "unlockTime": 1735776000000
      }
    },
    {
      "timestamp": 1735776000000,
      "eventType": "SEAL_UNLOCKED",
      "ip": "192.168.1.2",
      "metadata": {}
    }
  ]
}
```

#### Event Types
- `SEAL_CREATED`: Seal was created
- `SEAL_UNLOCKED`: Seal was successfully unlocked
- `SEAL_ACCESS_DENIED`: Attempted access while locked
- `PULSE_UPDATED`: Dead Man's Switch pulse received
- `SEAL_BURNED`: Seal permanently destroyed

---

### 7. Health Check

**GET** `/api/health`

Returns service health status.

#### Response (200 OK)
```json
{
  "status": "healthy",
  "timestamp": 1735689600000,
  "version": "0.2.0"
}
```

---

### 8. Metrics

**GET** `/api/metrics`

Returns service metrics (Prometheus format).

#### Response (200 OK)
```
# HELP timeseal_seals_created_total Total number of seals created
# TYPE timeseal_seals_created_total counter
timeseal_seals_created_total 1234

# HELP timeseal_seals_unlocked_total Total number of seals unlocked
# TYPE timeseal_seals_unlocked_total counter
timeseal_seals_unlocked_total 567

# HELP timeseal_pulses_received_total Total number of pulses received
# TYPE timeseal_pulses_received_total counter
timeseal_pulses_received_total 89
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation error)
- `404`: Not Found (seal doesn't exist)
- `413`: Payload Too Large (file > 25MB)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

---

## Client-Side Encryption Flow

1. **Generate Keys**:
   ```javascript
   const keyA = crypto.getRandomValues(new Uint8Array(32));
   const keyB = crypto.getRandomValues(new Uint8Array(32));
   const iv = crypto.getRandomValues(new Uint8Array(12));
   ```

2. **Encrypt Content**:
   ```javascript
   const key = await crypto.subtle.importKey(
     'raw',
     combineKeys(keyA, keyB),
     { name: 'AES-GCM' },
     false,
     ['encrypt']
   );
   
   const encrypted = await crypto.subtle.encrypt(
     { name: 'AES-GCM', iv },
     key,
     content
   );
   ```

3. **Create Seal**:
   - Send `encryptedBlob`, `keyB`, `iv` to server
   - Keep `keyA` in URL hash (never sent to server)

4. **Decrypt Content** (after unlock):
   - Get `keyB` from server (only when unlocked)
   - Combine `keyA` (from URL) + `keyB` (from server)
   - Decrypt using combined key

---

## Security Considerations

### Time-Lock Enforcement
- Server validates unlock time using `Date.now()` (server-side)
- Client clock manipulation has no effect
- Key B is withheld until `serverTime >= unlockTime`

### Split-Key Architecture
- **Key A**: Stored in URL hash, never sent to server
- **Key B**: Encrypted and stored in database
- Both keys required for decryption

### Rate Limiting
- Per-IP address tracking
- 429 status with `Retry-After` header
- Prevents brute-force attacks

### CAPTCHA Protection
- Turnstile CAPTCHA required for seal creation
- Prevents automated abuse

### Replay Protection
- Pulse tokens include nonces
- Nonce validation prevents replay attacks

---

## OpenAPI Specification

See [openapi.yaml](./openapi.yaml) for the complete OpenAPI 3.0 specification.

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { encryptData } from '@/lib/crypto';

// Create seal
const encrypted = await encryptData('secret message');
const formData = new FormData();
formData.append('encryptedBlob', new Blob([encrypted.encryptedBlob]));
formData.append('keyB', encrypted.keyB);
formData.append('iv', encrypted.iv);
formData.append('unlockTime', Date.now() + 86400000);
formData.append('cf-turnstile-response', turnstileToken);

const response = await fetch('/api/create-seal', {
  method: 'POST',
  body: formData
});

const { publicUrl } = await response.json();
const vaultLink = `${window.location.origin}${publicUrl}#${encrypted.keyA}`;
```

### Python
```python
import requests
import time

# Get seal status
seal_id = "abc123def456"
response = requests.get(f"https://timeseal.online/api/seal/{seal_id}")
data = response.json()

if data['isLocked']:
    print(f"Locked. Time remaining: {data['timeRemaining']}ms")
else:
    print(f"Unlocked! Key B: {data['keyB']}")
```

### cURL
```bash
# Send pulse
curl -X POST https://timeseal.online/api/pulse \
  -H "Content-Type: application/json" \
  -d '{"pulseToken":"your-uuid-token"}'
```

---

## Support

- **Documentation**: [GitHub](https://github.com/teycir/timeseal)
- **Issues**: [GitHub Issues](https://github.com/teycir/timeseal/issues)
- **Security**: See [SECURITY.md](./SECURITY.md)
