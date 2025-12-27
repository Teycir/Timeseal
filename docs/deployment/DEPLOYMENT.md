# Deployment Guide

## Prerequisites

- Cloudflare account with Workers enabled
- Node.js 20+ installed
- Wrangler CLI: `npm install -g wrangler`

## Setup Steps

### 1. Configure Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create R2 bucket
wrangler r2 bucket create timeseal-storage

# Create D1 database
wrangler d1 create timeseal-db

# Note the database_id from output
```

### 2. Configure Environment

```bash
# Copy example files
cp .env.example .env
cp wrangler.toml.example wrangler.toml

# Generate master encryption key
openssl rand -base64 32

# Set secrets
wrangler secret put MASTER_ENCRYPTION_KEY
# Paste the generated key when prompted
```

### 3. Update wrangler.toml

Replace `database_id` with your D1 database ID from step 1.

### 4. Initialize Database

```bash
# Run migrations (create schema)
wrangler d1 execute timeseal-db --file=./schema.sql
```

### 5. Deploy

```bash
# Install dependencies
npm install

# Build and deploy
npm run build
wrangler deploy
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MASTER_ENCRYPTION_KEY` | Yes | Master key for encrypting keyB (32 bytes base64) |
| `NODE_ENV` | Yes | `production` or `development` |
| `RATE_LIMIT_ENABLED` | No | Enable rate limiting (default: true) |
| `ENABLE_AUDIT_LOGS` | No | Enable audit logging (default: true) |
| `MAX_FILE_SIZE_MB` | No | Max file size in MB (default: 100) |
| `MAX_SEAL_DURATION_DAYS` | No | Max seal duration (default: 365) |

## Monitoring

### View Logs
```bash
wrangler tail
```

### Metrics Endpoint
```
GET https://your-worker.workers.dev/api/metrics
```

### Cloudflare Dashboard
- Workers Analytics: Real-time request metrics
- R2 Analytics: Storage usage
- D1 Analytics: Database queries

## Security Checklist

- [ ] MASTER_ENCRYPTION_KEY set and secured
- [ ] Rate limiting enabled
- [ ] Audit logs enabled
- [ ] R2 bucket not publicly accessible
- [ ] D1 database access restricted
- [ ] HTTPS enforced (automatic with Workers)
- [ ] Secrets not committed to git

## Troubleshooting

### "Circuit breaker is OPEN"
R2 operations are failing. Check R2 bucket configuration and permissions.

### "MASTER_ENCRYPTION_KEY not configured"
Set the secret: `wrangler secret put MASTER_ENCRYPTION_KEY`

### High latency
- Check R2 bucket region (should match worker region)
- Review D1 query performance
- Enable caching where appropriate

## Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback [deployment-id]
```
