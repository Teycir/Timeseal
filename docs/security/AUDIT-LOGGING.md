# Audit Logging

TimeSeal implements immutable audit logging for all seal operations.

## Logged Events

- Seal creation
- Seal access attempts (locked/unlocked)
- Dead Man's Switch pulse events
- Seal deletion/burning

## Implementation

Audit logs are stored in the D1 database with:
- Timestamp (ISO 8601)
- Event type
- Seal ID
- IP address (hashed for privacy)
- User agent (hashed)
- Success/failure status

## Privacy

All personally identifiable information (IP, User-Agent) is SHA-256 hashed before storage.

## Retention

Audit logs are retained for 90 days and automatically purged.

## Access

Audit logs are not publicly accessible. Self-hosted instances can query the database directly.
