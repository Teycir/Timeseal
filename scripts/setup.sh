#!/bin/bash
set -e

echo "🔧 Setting up Cloudflare resources..."

echo "📦 Creating R2 bucket..."
echo "⚠️  If this fails, enable R2 at: https://dash.cloudflare.com/?to=/:account/r2"
npx wrangler r2 bucket create timeseal-vault || echo "Bucket may already exist or R2 not enabled"

echo "🗄️  D1 database already created: timeseal-db"

echo "✅ Setup complete!"
echo "Run: bash scripts/deploy.sh"
