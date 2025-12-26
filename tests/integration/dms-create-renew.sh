#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
NONCE1=$(uuidgen)
NONCE2=$(uuidgen)

echo "=== DMS Create → Renew Test ==="
echo "Nonce1: $NONCE1"
echo "Nonce2: $NONCE2"

# Create DMS seal
echo -e "\n[1/3] Creating DMS seal..."
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/create-seal" \
  -F "encryptedBlob=@-" \
  -F "encryptedKeyB=a2V5Qg==" \
  -F "iv=aXY=" \
  -F "unlockTime=$(($(date +%s) * 1000 + 86400000))" \
  -F "isDMS=true" \
  -F "pulseInterval=3600000" \
  -F "turnstileToken=test-token" \
  -F "operationNonce=$NONCE1" <<< "dGVzdA==")

SEAL_ID=$(echo "$CREATE_RESPONSE" | jq -r '.sealId')
PULSE_TOKEN=$(echo "$CREATE_RESPONSE" | jq -r '.pulseToken')

if [ -z "$SEAL_ID" ] || [ "$SEAL_ID" = "null" ]; then
  echo "❌ Failed to create seal"
  echo "$CREATE_RESPONSE"
  exit 1
fi

echo "✅ Seal created: $SEAL_ID"

# Renew with unique nonce
echo -e "\n[2/3] Renewing seal..."
RENEW_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pulse" \
  -H "Content-Type: application/json" \
  -d "{
    \"pulseToken\": \"$PULSE_TOKEN\",
    \"operationNonce\": \"$NONCE2\"
  }")

NEW_UNLOCK=$(echo "$RENEW_RESPONSE" | jq -r '.newUnlockTime')

if [ -z "$NEW_UNLOCK" ] || [ "$NEW_UNLOCK" = "null" ]; then
  echo "❌ Failed to renew seal"
  echo "$RENEW_RESPONSE"
  exit 1
fi

echo "✅ Seal renewed: $NEW_UNLOCK"

# Attempt replay with same nonce
echo -e "\n[3/3] Testing nonce replay protection..."
REPLAY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/pulse" \
  -H "Content-Type: application/json" \
  -d "{
    \"pulseToken\": \"$PULSE_TOKEN\",
    \"operationNonce\": \"$NONCE2\"
  }")

ERROR=$(echo "$REPLAY_RESPONSE" | jq -r '.error')

if [ "$ERROR" = "Operation already processed" ]; then
  echo "✅ Nonce replay blocked"
else
  echo "❌ Nonce replay NOT blocked"
  echo "$REPLAY_RESPONSE"
  exit 1
fi

echo -e "\n✅ All tests passed"
