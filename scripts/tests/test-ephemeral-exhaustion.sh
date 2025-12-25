#!/bin/bash
set -e

API_URL="${1:-http://localhost:3000}"
MAX_VIEWS="${2:-1}"

echo "Testing ephemeral seal exhaustion on $API_URL"

# Create ephemeral seal
UNLOCK_TIME=$(date +%s)000
TEMP_FILE=$(mktemp)
echo "Test" > "$TEMP_FILE"
KEY_B=$(openssl rand -base64 32 | tr -d '\n')
IV=$(openssl rand -base64 12 | tr -d '\n')

CREATE=$(curl -s -X POST "$API_URL/api/create-seal" \
  -F "encryptedBlob=@$TEMP_FILE" \
  -F "keyB=$KEY_B" \
  -F "iv=$IV" \
  -F "unlockTime=$UNLOCK_TIME" \
  -F "isEphemeral=true" \
  -F "maxViews=$MAX_VIEWS")

rm "$TEMP_FILE"
SEAL_ID=$(echo "$CREATE" | jq -r '.sealId')

echo "Created seal: $SEAL_ID"
echo ""

# Access seal MAX_VIEWS times
for i in $(seq 1 $MAX_VIEWS); do
  RESPONSE=$(curl -s "$API_URL/api/seal/$SEAL_ID")
  REMAINING=$(echo "$RESPONSE" | jq -r '.remainingViews')
  HAS_BLOB=$(echo "$RESPONSE" | jq 'has("encryptedBlob")')
  
  echo "View $i/$MAX_VIEWS: remaining=$REMAINING, hasBlob=$HAS_BLOB"
  
  # Check if exhausted on final view
  if [ "$i" -eq "$MAX_VIEWS" ] && [ "$REMAINING" = "0" ]; then
    echo ""
    echo "✓ Seal exhausted after $MAX_VIEWS views"
    
    # Verify blob returned (Fix #9)
    if [ "$HAS_BLOB" = "true" ]; then
      echo "✓ Blob returned when exhausted (Fix #9)"
      exit 0
    else
      echo "✗ Blob missing on exhausted seal"
      exit 1
    fi
  fi
done

echo ""
echo "✗ Seal not exhausted after $MAX_VIEWS views"
exit 1
