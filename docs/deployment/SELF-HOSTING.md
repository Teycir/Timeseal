# Self-Hosting TimeSeal

## Why Self-Host?

Self-hosting eliminates the three highest-priority threats:

1. **Browser Extension/Malware** - You control the deployment environment
2. **Cloudflare Infrastructure** - You control time validation and key storage
3. **Legal Coercion** - You are the operator, not a third party

## Requirements

- Cloudflare account (free tier works)
- Node.js 18+ and npm
- Git
- OpenSSL (for key generation)

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/teycir/timeseal.git
cd timeseal
npm install
```

### 2. Configure Cloudflare

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create D1 database
wrangler d1 create timeseal-db
```

Copy the database ID from output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "timeseal-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 3. Initialize Database

```bash
wrangler d1 execute timeseal-db --file=./schema.sql
```

### 4. Generate Master Encryption Key

```bash
openssl rand -base64 32
```

Set as secret:

```bash
wrangler secret put MASTER_ENCRYPTION_KEY
# Paste the generated key when prompted
```

### 5. Configure Turnstile (Optional)

Create a Turnstile site at https://dash.cloudflare.com/?to=/:account/turnstile

Update `.env.local`:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

Set secret:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

### 6. Deploy

```bash
npm run deploy
```

Your TimeSeal instance is now live at `https://timeseal.YOUR_SUBDOMAIN.workers.dev`

## Custom Domain (Optional)

### 1. Add Domain to Cloudflare

Add your domain to Cloudflare and update nameservers.

### 2. Configure Worker Route

In Cloudflare dashboard:
- Workers & Pages → timeseal → Settings → Triggers
- Add Custom Domain: `timeseal.yourdomain.com`

### 3. Update Configuration

Update `next.config.js`:

```javascript
const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://timeseal.yourdomain.com',
  },
};
```

Redeploy:

```bash
npm run deploy
```

## Alternative Platforms

### AWS Lambda + DynamoDB

```bash
# Install Serverless Framework
npm install -g serverless

# Configure AWS credentials
aws configure

# Deploy
serverless deploy
```

See `docs/AWS_DEPLOYMENT.md` for details.

### Google Cloud Functions + Firestore

```bash
# Install gcloud CLI
gcloud init

# Deploy
gcloud functions deploy timeseal
```

See `docs/GCP_DEPLOYMENT.md` for details.

### Self-Hosted Node.js + PostgreSQL

```bash
# Install dependencies
npm install

# Configure PostgreSQL
createdb timeseal
psql timeseal < schema.sql

# Set environment variables
export DATABASE_URL=postgresql://user:pass@localhost/timeseal
export MASTER_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Run server
npm run start
```

See `docs/NODEJS_DEPLOYMENT.md` for details.

## Security Considerations

### Master Key Management

**CRITICAL**: The master encryption key must be kept secure.

- Store in environment variables (never in code)
- Use Cloudflare Secrets or AWS Secrets Manager
- Rotate every 90 days (see `docs/KEY-ROTATION.md`)
- Backup securely (encrypted, offline storage)

### Time Validation

Self-hosted instances use `Date.now()` from your infrastructure:

- Ensure NTP is configured and synchronized
- Monitor clock drift
- Consider multi-party time attestation (see `lib/timeAttestation.ts`)

### Database Backups

```bash
# Backup D1 database
wrangler d1 export timeseal-db --output=backup.sql

# Restore
wrangler d1 execute timeseal-db --file=backup.sql
```

### Monitoring

Set up monitoring for:

- Seal creation rate (detect abuse)
- Failed decryption attempts (detect attacks)
- Clock skew (detect time manipulation)
- Database size (capacity planning)

## Maintenance

### Update TimeSeal

```bash
git pull origin main
npm install
npm run deploy
```

### Rotate Master Key

See `docs/KEY-ROTATION.md` for detailed procedure.

### Monitor Logs

```bash
wrangler tail
```

### Database Maintenance

```bash
# Check database size
wrangler d1 info timeseal-db

# Clean expired seals (if auto-expiration enabled)
wrangler d1 execute timeseal-db --command="DELETE FROM seals WHERE expires_at < $(date +%s)000"
```

## Cost Estimates

### Cloudflare Workers (Free Tier)

- 100,000 requests/day: **FREE**
- D1 database: 5GB storage, 5M reads/day: **FREE**
- Turnstile: Unlimited: **FREE**

### Cloudflare Workers (Paid)

- $5/month for 10M requests
- D1: $0.75/GB storage, $0.001/1K reads

### AWS Lambda

- 1M requests/month: **FREE** (first year)
- DynamoDB: 25GB storage: **FREE**
- After free tier: ~$10-50/month depending on usage

### Self-Hosted

- VPS: $5-20/month (DigitalOcean, Linode, etc.)
- PostgreSQL: Included
- Full control over infrastructure

## Troubleshooting

### "Database not found"

```bash
wrangler d1 list
# Verify database exists and ID matches wrangler.toml
```

### "Master key not set"

```bash
wrangler secret list
# Should show MASTER_ENCRYPTION_KEY
# If missing: wrangler secret put MASTER_ENCRYPTION_KEY
```

### "Turnstile verification failed"

Check that `TURNSTILE_SECRET_KEY` is set:

```bash
wrangler secret list
```

### "Time skew detected"

Ensure NTP is configured:

```bash
# Linux
sudo timedatectl set-ntp true

# macOS
sudo sntp -sS time.apple.com
```

## Support

- GitHub Issues: https://github.com/teycir/timeseal/issues
- Documentation: https://github.com/teycir/timeseal/tree/main/docs
- Email: support@timeseal.dev

## License

TimeSeal is licensed under the Business Source License (BSL).

- **Free for non-commercial use**
- **Commercial use requires license**
- **Self-hosting is permitted under BSL terms**

See [LICENSE](../LICENSE) for full terms.
