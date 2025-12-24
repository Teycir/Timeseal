#!/bin/bash
set -e

API_URL="${1:-http://localhost:3000}"
MAX_VIEWS="${2:-3}"

echo "Testing ephemeral seal creation on $API_URL"
echo "Max views: $MAX_VIEWS"

# Ephemeral seals unlock immediately
UNLOCK_TIME=$(date +%s)000

TEMP_FILE=$(mktemp)
echo "Ephemeral test message - self-destructs after $MAX_VIEWS views" > "$TEMP_FILE"

KEY_B=$(openssl rand -base64 32 | tr -d '\n')
IV=$(openssl rand -base64 12 | tr -d '\n')

RESPONSE=$(curl -s -X POST "$API_URL/api/create-seal" \
  -F "encryptedBlob=@$TEMP_FILE" \
  -F "keyB=$KEY_B" \
  -F "iv=$IV" \
  -F "unlockTime=$UNLOCK_TIME" \
  -F "isDMS=false" \
  -F "isEphemeral=true" \
  -F "maxViews=$MAX_VIEWS")

rm "$TEMP_FILE"

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')
  echo ""
  echo "✓ Ephemeral seal created successfully"
  echo "  Seal ID: $SEAL_ID"
  echo "  Max views: $MAX_VIEWS"
  echo "  Status: Unlocked immediately (ephemeral)"
  echo ""
  echo "Testing seal status..."
  
  STATUS=$(curl -s "$API_URL/api/seal/$SEAL_ID")
  echo "$STATUS" | jq .
  
  if echo "$STATUS" | jq -e '.isLocked == false' > /dev/null 2>&1; then
    echo ""
    echo "✓ Seal is unlocked (as expected for ephemeral)"
    
    MAX_VIEWS_DB=$(echo "$STATUS" | jq -r '.maxViews // "null"')
    VIEW_COUNT=$(echo "$STATUS" | jq -r '.viewCount // 0')
    
    if [ "$MAX_VIEWS_DB" = "$MAX_VIEWS" ]; then
      echo "✓ Max views correctly set: $MAX_VIEWS_DB"
    else
      echo "✗ Max views mismatch: expected $MAX_VIEWS, got $MAX_VIEWS_DB"
      exit 1
    fi
    
    echo "✓ Current view count: $VIEW_COUNT"
    echo ""
    echo "Ephemeral seal test PASSED"
  else
    echo "✗ Seal is locked (unexpected for ephemeral)"
    exit 1
  fi
else
  echo ""
  echo "✗ Ephemeral seal creation failed"
  exit 1
fi
