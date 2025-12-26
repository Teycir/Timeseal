#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "=== DMS Create → Renew Test ==="

# Create DMS seal
echo -e "\n[1/3] Creating DMS seal..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/create-seal" \
  -F "encryptedBlob=@-" \
  -F "keyB=YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=" \
  -F "iv=YWJjZGVmZ2hpamts" \
  -F "unlockTime=$(($(date +%s) * 1000 + 86400000))" \
  -F "isDMS=true" \
  -F "pulseInterval=3600000" <<< "test")

PULSE_TOKEN=$(echo "$RESPONSE" | jq -r '.pulseToken')
SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')

if [ "$PULSE_TOKEN" = "null" ]; then
  echo "❌ Failed to create seal"
  echo "$RESPONSE"
  exit 1
fi

echo "✅ Seal created: $SEAL_ID"

# Renew with nonce
echo -e "\n[2/3] Renewing seal..."
NONCE1=$(uuidgen)
RENEW=$(curl -s -X POST "$BASE_URL/api/pulse" \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\": \"$PULSE_TOKEN\", \"operationNonce\": \"$NONCE1\"}")

NEW_UNLOCK=$(echo "$RENEW" | jq -r '.newUnlockTime')
NEW_PULSE_TOKEN=$(echo "$RENEW" | jq -r '.newPulseToken')

if [ "$NEW_UNLOCK" = "null" ]; then
  echo "❌ Failed to renew"
  echo "$RENEW"
  exit 1
fi

echo "✅ Seal renewed"

# Test replay protection
echo -e "\n[3/3] Testing nonce replay..."
REPLAY=$(curl -s -X POST "$BASE_URL/api/pulse" \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\": \"$NEW_PULSE_TOKEN\", \"operationNonce\": \"$NONCE1\"}")

ERROR=$(echo "$REPLAY" | jq -r '.error.details // .error.message // .error // empty')

if echo "$ERROR" | grep -q "already processed"; then
  echo "✅ Nonce replay blocked"
else
  echo "❌ Nonce replay NOT blocked"
  echo "$REPLAY"
  exit 1
fi

echo -e "\n✅ All tests passed"
