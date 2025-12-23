#!/bin/bash
set -e

echo "🚀 TimeSeal Deployment Script"
echo "=============================="

# Safety checks
echo "1️⃣ Running lint..."
npm run lint || exit 1

echo "2️⃣ Type checking..."
npx tsc --noEmit || exit 1

echo "3️⃣ Building..."
npx @opennextjs/cloudflare build || exit 1

echo "4️⃣ Checking build output..."
if [ ! -d ".open-next" ]; then
  echo "❌ Build failed - .open-next directory not found"
  exit 1
fi

echo "5️⃣ Deploying to Cloudflare..."
npx wrangler deploy || exit 1

echo "✅ Deployment successful!"
echo "🌐 Live at: https://timeseal.teycir-932.workers.dev"
echo ""
echo "⚠️  Clear browser cache (Ctrl+Shift+R) to see changes"
