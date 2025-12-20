#!/bin/bash
# Cloudflare Infrastructure Setup Script for Time-Seal

set -e

echo "🚀 Time-Seal Cloudflare Infrastructure Setup"
echo "=============================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

echo "✅ Wrangler CLI found"
echo ""

# Login to Cloudflare
echo "📝 Step 1: Login to Cloudflare"
wrangler login

# Create R2 bucket
echo ""
echo "📦 Step 2: Creating R2 bucket with Object Lock"
read -p "Enter R2 bucket name (default: timeseal-storage): " BUCKET_NAME
BUCKET_NAME=${BUCKET_NAME:-timeseal-storage}

wrangler r2 bucket create $BUCKET_NAME || echo "Bucket may already exist"

echo "⚠️  IMPORTANT: Enable Object Lock on bucket via Cloudflare Dashboard"
echo "   1. Go to R2 > $BUCKET_NAME > Settings"
echo "   2. Enable Object Lock (WORM compliance)"
echo "   3. Set default retention mode to 'Governance'"
echo ""
read -p "Press Enter after enabling Object Lock..."

# Create D1 database
echo ""
echo "🗄️  Step 3: Creating D1 database"
read -p "Enter D1 database name (default: timeseal-db): " DB_NAME
DB_NAME=${DB_NAME:-timeseal-db}

DB_OUTPUT=$(wrangler d1 create $DB_NAME)
echo "$DB_OUTPUT"

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk '{print $3}' | tr -d '"')
echo "Database ID: $DB_ID"

# Run schema migrations
echo ""
echo "📋 Step 4: Running database migrations"
wrangler d1 execute $DB_NAME --file=./schema.sql

# Generate master encryption key
echo ""
echo "🔐 Step 5: Generating master encryption key"
MASTER_KEY=$(openssl rand -base64 32)
echo "Generated key (save this securely): $MASTER_KEY"

# Set secrets
echo ""
echo "🔑 Step 6: Setting Cloudflare secrets"
echo "$MASTER_KEY" | wrangler secret put MASTER_ENCRYPTION_KEY

# Update wrangler.toml
echo ""
echo "📝 Step 7: Updating wrangler.toml"
cat > wrangler.toml << EOF
name = "timeseal"
main = "src/index.ts"
compatibility_date = "2024-01-15"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "$BUCKET_NAME"

[[d1_databases]]
binding = "DB"
database_name = "$DB_NAME"
database_id = "$DB_ID"

[vars]
NODE_ENV = "production"
RATE_LIMIT_ENABLED = "true"
ENABLE_AUDIT_LOGS = "true"
MAX_FILE_SIZE_MB = "100"
MAX_SEAL_DURATION_DAYS = "365"

[env.staging]
name = "timeseal-staging"
vars = { NODE_ENV = "staging" }

[env.development]
name = "timeseal-dev"
vars = { NODE_ENV = "development", USE_MOCK_STORAGE = "true" }
EOF

echo "✅ wrangler.toml created"

# Deploy to staging
echo ""
echo "🚀 Step 8: Deploying to staging"
read -p "Deploy to staging now? (y/n): " DEPLOY
if [ "$DEPLOY" = "y" ]; then
    npm run build
    wrangler deploy --env staging
    echo "✅ Deployed to staging"
fi

echo ""
echo "✅ Infrastructure setup complete!"
echo ""
echo "📋 Summary:"
echo "  - R2 Bucket: $BUCKET_NAME"
echo "  - D1 Database: $DB_NAME ($DB_ID)"
echo "  - Master Key: Set as secret"
echo "  - wrangler.toml: Updated"
echo ""
echo "🔗 Next steps:"
echo "  1. Test staging deployment"
echo "  2. Run load tests"
echo "  3. Conduct security review"
echo "  4. Deploy to production: wrangler deploy"
