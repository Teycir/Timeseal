#!/bin/bash
# Generate PGP key and sign warrant canary

echo "🔐 TimeSeal Warrant Canary Setup"
echo ""

# Check if GPG is installed
if ! command -v gpg &> /dev/null; then
    echo "❌ GPG not found. Install with:"
    echo "   macOS: brew install gnupg"
    echo "   Linux: sudo apt install gnupg"
    exit 1
fi

# Generate key if needed
if ! gpg --list-keys "timeseal@security" &> /dev/null; then
    echo "📝 Generating new PGP key..."
    gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 4096
Name-Real: TimeSeal Security
Name-Email: timeseal@security
Expire-Date: 0
%no-protection
%commit
EOF
    echo "✅ Key generated"
else
    echo "✅ Key already exists"
fi

# Update canary date
TODAY=$(date -u +"%Y-%m-%d")
NEXT_MONTH=$(date -u -d "+1 month" +"%Y-%m-%d" 2>/dev/null || date -u -v+1m +"%Y-%m-%d")

echo ""
echo "📅 Updating canary date to: $TODAY"
echo "📅 Next update: $NEXT_MONTH"

# Update canary file
sed -i.bak "s/As of [0-9-]*/As of $TODAY/" public/canary.txt
sed -i.bak "s/Next scheduled update: [0-9-]*/Next scheduled update: $NEXT_MONTH/" public/canary.txt

# Sign canary
echo ""
echo "✍️  Signing canary..."
gpg --clear-sign --armor --local-user "timeseal@security" public/canary.txt
mv public/canary.txt.asc public/canary.txt
rm public/canary.txt.bak

# Export public key
gpg --armor --export "timeseal@security" > public/pgp-key.asc

echo ""
echo "✅ Canary signed and updated!"
echo ""
echo "📋 Next steps:"
echo "   1. Review public/canary.txt"
echo "   2. Commit and deploy: git add public/canary.txt public/pgp-key.asc && git commit -m 'Update warrant canary'"
echo "   3. Set reminder for $NEXT_MONTH"
