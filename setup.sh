#!/bin/bash
set -e

# TimeSeal Self-Hosting Setup Script
# This script automates the deployment of TimeSeal to Cloudflare Workers

echo "🔒 TimeSeal Self-Hosting Setup"
echo "================================"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Visit https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }

# Check if wrangler is installed
if ! command -v wrangler >/dev/null 2>&1; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

echo "✅ Prerequisites check passed"
echo ""

# Cloudflare login
echo "🔐 Cloudflare Authentication"
echo "----------------------------"
read -p "Have you logged into Cloudflare? (y/n): " logged_in
if [ "$logged_in" != "y" ]; then
    echo "Logging into Cloudflare..."
    wrangler login
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate master encryption key
echo ""
echo "🔑 Generating Master Encryption Key"
echo "-----------------------------------"
MASTER_KEY=$(openssl rand -base64 32)
echo "Generated key: $MASTER_KEY"
echo ""
echo "⚠️  SAVE THIS KEY SECURELY - You'll need it for key rotation!"
echo "Setting master encryption key..."
echo "$MASTER_KEY" | wrangler secret put MASTER_ENCRYPTION_KEY

# Setup Turnstile (optional)
echo ""
echo "🤖 Cloudflare Turnstile Setup (Bot Protection)"
echo "----------------------------------------------"
read -p "Do you want to configure Turnstile? (y/n): " setup_turnstile
if [ "$setup_turnstile" = "y" ]; then
    echo "1. Visit: https://dash.cloudflare.com/?to=/:account/turnstile"
    echo "2. Create a new site"
    echo "3. Copy your Site Key and Secret Key"
    echo ""
    read -p "Enter Turnstile Site Key: " site_key
    read -p "Enter Turnstile Secret Key: " secret_key
    
    echo "$site_key" | wrangler secret put NEXT_PUBLIC_TURNSTILE_SITE_KEY
    echo "$secret_key" | wrangler secret put TURNSTILE_SECRET_KEY
    echo "✅ Turnstile configured"
else
    echo "⚠️  Skipping Turnstile - Bot protection will be disabled"
fi

# Create D1 database
echo ""
echo "🗄️  Creating D1 Database"
echo "-----------------------"
DB_NAME="timeseal-db"
echo "Creating database: $DB_NAME"
wrangler d1 create $DB_NAME

echo ""
echo "📝 Update wrangler.toml with the database ID shown above"
echo "   Look for [[d1_databases]] section and update database_id"
read -p "Press Enter after updating wrangler.toml..."

# Run migrations
echo ""
echo "🔄 Running database migrations..."
wrangler d1 migrations apply $DB_NAME --remote

# Build the project
echo ""
echo "🏗️  Building project..."
npm run build

# Deploy
echo ""
echo "🚀 Deploying to Cloudflare Workers"
echo "----------------------------------"
read -p "Ready to deploy? (y/n): " ready_deploy
if [ "$ready_deploy" = "y" ]; then
    npm run deploy
    echo ""
    echo "✅ Deployment complete!"
else
    echo "⏸️  Deployment skipped. Run 'npm run deploy' when ready."
fi

# Final instructions
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Your TimeSeal instance is deployed"
echo "2. Visit your Workers URL to test"
echo "3. Update DNS (optional) to use custom domain"
echo "4. Save your master encryption key: $MASTER_KEY"
echo ""
echo "📚 Documentation:"
echo "- Self-Hosting Guide: docs/SELF-HOSTING.md"
echo "- Key Rotation: docs/KEY-ROTATION.md"
echo "- Security: docs/SECURITY.md"
echo ""
echo "⚠️  Important Security Notes:"
echo "- Store master key in password manager"
echo "- Enable Turnstile for production"
echo "- Review docs/TRUST-ASSUMPTIONS.md"
echo "- Set up monitoring and alerts"
echo ""
echo "Need help? https://github.com/teycir/timeseal/issues"
