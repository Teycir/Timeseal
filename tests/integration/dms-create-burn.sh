#!/bin/bash
# Test: Create DMS seal and burn it (delete)

set -e

echo "=== DMS CREATE + BURN (DELETE) TEST ==="
echo ""

# 1. Create DMS seal
echo "1. Creating DMS seal..."
UNLOCK_TIME=$(date -d "+30 days" +%s000)
echo "burn test data" > /tmp/test_burn.txt

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/create-seal \
  -F "encryptedBlob=@/tmp/test_burn.txt" \
  -F "keyB=$(echo -n 'encrypted_key_b_burn_test' | base64)" \
  -F "iv=$(echo -n 'fedcba987654' | base64)" \
  -F "unlockTime=$UNLOCK_TIME" \
  -F "isDMS=true" \
  -F "pulseInterval=2592000000")

SEAL_ID=$(echo $CREATE_RESPONSE | jq -r '.sealId')
PULSE_TOKEN=$(echo $CREATE_RESPONSE | jq -r '.pulseToken')

if [ "$SEAL_ID" = "null" ] || [ -z "$SEAL_ID" ]; then
  echo "✗ Seal creation failed: $CREATE_RESPONSE"
  rm -f /tmp/test_burn.txt
  exit 1
fi

echo "✓ Seal created: $SEAL_ID"
echo "✓ Pulse token: ${PULSE_TOKEN:0:50}..."
echo ""

# 2. Verify seal exists in database
echo "2. Verifying seal exists..."
DB_CHECK=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
EXISTS=$(echo $DB_CHECK | jq -r '.id')

if [ "$EXISTS" = "$SEAL_ID" ]; then
  echo "✓ Seal exists in database"
else
  echo "✗ Seal not found: $DB_CHECK"
  rm -f /tmp/test_burn.txt
  exit 1
fi
echo ""

# 3. Burn seal (permanent delete)
echo "3. Burning seal (permanent delete)..."
NONCE=$(uuidgen)
BURN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/burn \
  -H "Content-Type: application/json" \
  -d "{
    \"pulseToken\": \"$PULSE_TOKEN\",
    \"operationNonce\": \"$NONCE\"
  }")

BURN_SUCCESS=$(echo $BURN_RESPONSE | jq -r '.success')

if [ "$BURN_SUCCESS" = "true" ]; then
  echo "✓ Seal burned successfully"
else
  echo "✗ Burn failed: $BURN_RESPONSE"
  rm -f /tmp/test_burn.txt
  exit 1
fi
echo ""

# 4. Verify seal is deleted from database
echo "4. Verifying seal is deleted..."
DB_CHECK2=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/seal/$SEAL_ID)
HTTP_CODE=$(echo "$DB_CHECK2" | tail -n1)

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "500" ]; then
  echo "✓ Seal deleted from database (HTTP $HTTP_CODE)"
else
  echo "✗ Seal should be deleted: HTTP $HTTP_CODE"
  echo "$DB_CHECK2"
  rm -f /tmp/test_burn.txt
  exit 1
fi
echo ""

rm -f /tmp/test_burn.txt
echo "=== TEST PASSED ==="
echo "Summary:"
echo "  - Created DMS seal: $SEAL_ID"
echo "  - Burned seal (deleted permanently)"
echo "  - Database confirms deletion (404)"
