#!/bin/bash
# Test: Create DMS seal and unlock it (revoke)

set -e

echo "=== DMS CREATE + UNLOCK (REVOKE) TEST ==="
echo ""

# 1. Create DMS seal
echo "1. Creating DMS seal..."
UNLOCK_TIME=$(date -d "+14 days" +%s000)
echo "revoke test data" > /tmp/test_revoke.txt

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/create-seal \
  -F "encryptedBlob=@/tmp/test_revoke.txt" \
  -F "keyB=$(echo -n 'encrypted_key_b_revoke_test' | base64)" \
  -F "iv=$(echo -n 'abcdefghijkl' | base64)" \
  -F "unlockTime=$UNLOCK_TIME" \
  -F "isDMS=true" \
  -F "pulseInterval=1209600000")

SEAL_ID=$(echo $CREATE_RESPONSE | jq -r '.sealId')
PULSE_TOKEN=$(echo $CREATE_RESPONSE | jq -r '.pulseToken')

if [ "$SEAL_ID" = "null" ] || [ -z "$SEAL_ID" ]; then
  echo "✗ Seal creation failed: $CREATE_RESPONSE"
  rm -f /tmp/test_revoke.txt
  exit 1
fi

echo "✓ Seal created: $SEAL_ID"
echo "✓ Pulse token: ${PULSE_TOKEN:0:50}..."
echo ""

# 2. Verify seal is locked
echo "2. Verifying seal is locked..."
DB_CHECK=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
IS_LOCKED=$(echo $DB_CHECK | jq -r '.isLocked')

if [ "$IS_LOCKED" = "true" ]; then
  echo "✓ Seal is locked"
else
  echo "✗ Seal should be locked: $DB_CHECK"
  rm -f /tmp/test_revoke.txt
  exit 1
fi
echo ""

# 3. Unlock seal immediately (revoke)
echo "3. Unlocking seal immediately (revoke)..."
NONCE=$(uuidgen)
UNLOCK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/unlock \
  -H "Content-Type: application/json" \
  -d "{
    \"pulseToken\": \"$PULSE_TOKEN\",
    \"operationNonce\": \"$NONCE\"
  }")

UNLOCK_SUCCESS=$(echo $UNLOCK_RESPONSE | jq -r '.success')

if [ "$UNLOCK_SUCCESS" = "true" ]; then
  echo "✓ Seal unlocked successfully"
else
  echo "✗ Unlock failed: $UNLOCK_RESPONSE"
  rm -f /tmp/test_revoke.txt
  exit 1
fi
echo ""

# 4. Verify seal is now unlocked in database
echo "4. Verifying seal is unlocked..."
DB_CHECK2=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
IS_LOCKED2=$(echo $DB_CHECK2 | jq -r '.isLocked')
UNLOCK_TIME_DB=$(echo $DB_CHECK2 | jq -r '.unlockTime')
NOW=$(date +%s000)

if [ "$IS_LOCKED2" = "false" ]; then
  echo "✓ Seal is now unlocked"
  echo "✓ Unlock time: $(date -d @$((UNLOCK_TIME_DB/1000)))"
else
  echo "✗ Seal should be unlocked: isLocked=$IS_LOCKED2, unlockTime=$UNLOCK_TIME_DB"
  rm -f /tmp/test_revoke.txt
  exit 1
fi
echo ""

rm -f /tmp/test_revoke.txt
echo "=== TEST PASSED ==="
echo "Summary:"
echo "  - Created DMS seal: $SEAL_ID"
echo "  - Revoked seal (unlocked immediately)"
echo "  - Database reflects unlocked state"
