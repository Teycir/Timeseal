#!/bin/bash
# Comprehensive DMS Chained Test
# Tests: create→burn, create→revoke, create→renew, create→burn→renew

set -e

API_URL="${1:-http://localhost:3000}"

echo "=== COMPREHENSIVE DMS CHAINED TEST ==="
echo "API: $API_URL"
echo ""

# Helper function
create_dms() {
    local name="$1"
    UNLOCK_TIME=$(($(date +%s) * 1000 + 604800000))
    echo "$name test data" > /tmp/test_$name.txt
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/create-seal" \
        -F "encryptedBlob=@/tmp/test_$name.txt" \
        -F "keyB=$(openssl rand -base64 32 | tr -d '\n')" \
        -F "iv=$(openssl rand -base64 12 | tr -d '\n')" \
        -F "unlockTime=$UNLOCK_TIME" \
        -F "isDMS=true" \
        -F "pulseInterval=604800000")
    
    rm /tmp/test_$name.txt
    
    SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')
    PULSE_TOKEN=$(echo "$RESPONSE" | jq -r '.pulseToken')
    
    if [ "$SEAL_ID" = "null" ] || [ -z "$SEAL_ID" ]; then
        echo "✗ Failed to create $name seal"
        exit 1
    fi
    
    echo "✓ Created seal: $SEAL_ID"
}

# Test 1: CREATE → BURN
echo "=== Test 1: CREATE → BURN ==="
create_dms "burn1"
BURN1_TOKEN="$PULSE_TOKEN"

echo "Burning seal..."
NONCE1=$(uuidgen)
BURN_RESP=$(curl -s -X POST "$API_URL/api/burn" \
    -H "Content-Type: application/json" \
    -d "{\"pulseToken\":\"$BURN1_TOKEN\",\"operationNonce\":\"$NONCE1\"}")

if echo "$BURN_RESP" | jq -e '.success' >/dev/null; then
    echo "✓ Seal burned successfully"
else
    echo "✗ Burn failed"
    exit 1
fi
echo ""

# Test 2: CREATE → REVOKE (UNLOCK)
echo "=== Test 2: CREATE → REVOKE ==="
create_dms "revoke"
REVOKE_TOKEN="$PULSE_TOKEN"

echo "Revoking (unlocking) seal..."
NONCE2=$(uuidgen)
UNLOCK_RESP=$(curl -s -X POST "$API_URL/api/unlock" \
    -H "Content-Type: application/json" \
    -d "{\"pulseToken\":\"$REVOKE_TOKEN\",\"operationNonce\":\"$NONCE2\"}")

if echo "$UNLOCK_RESP" | jq -e '.success' >/dev/null; then
    echo "✓ Seal revoked successfully"
else
    echo "✗ Revoke failed"
    exit 1
fi
echo ""

# Test 3: CREATE → RENEW
echo "=== Test 3: CREATE → RENEW ==="
create_dms "renew"
RENEW_TOKEN="$PULSE_TOKEN"

echo "Renewing pulse..."
NONCE3=$(uuidgen)
PULSE_RESP=$(curl -s -X POST "$API_URL/api/pulse" \
    -H "Content-Type: application/json" \
    -d "{\"pulseToken\":\"$RENEW_TOKEN\",\"operationNonce\":\"$NONCE3\"}")

if echo "$PULSE_RESP" | jq -e '.success' >/dev/null; then
    NEW_UNLOCK=$(echo "$PULSE_RESP" | jq -r '.newUnlockTime')
    echo "✓ Pulse renewed successfully"
    echo "  New unlock: $(date -d @$((NEW_UNLOCK/1000)) 2>/dev/null || date -r $((NEW_UNLOCK/1000)))"
else
    echo "✗ Renew failed"
    exit 1
fi
echo ""

# Test 4: CREATE → RENEW → BURN
echo "=== Test 4: CREATE → RENEW → BURN ==="
create_dms "renew_burn"
RB_TOKEN="$PULSE_TOKEN"

echo "Step 1: Renewing pulse..."
NONCE4=$(uuidgen)
PULSE2_RESP=$(curl -s -X POST "$API_URL/api/pulse" \
    -H "Content-Type: application/json" \
    -d "{\"pulseToken\":\"$RB_TOKEN\",\"operationNonce\":\"$NONCE4\"}")

if echo "$PULSE2_RESP" | jq -e '.success' >/dev/null; then
    echo "✓ Pulse renewed"
else
    echo "✗ Renew failed"
    exit 1
fi

echo "Step 2: Burning seal..."
NONCE5=$(uuidgen)
BURN2_RESP=$(curl -s -X POST "$API_URL/api/burn" \
    -H "Content-Type: application/json" \
    -d "{\"pulseToken\":\"$RB_TOKEN\",\"operationNonce\":\"$NONCE5\"}")

if echo "$BURN2_RESP" | jq -e '.success' >/dev/null; then
    echo "✓ Seal burned after renewal"
else
    echo "✗ Burn after renew failed"
    exit 1
fi
echo ""

# Summary
echo "==================================="
echo "✅ ALL CHAINED TESTS PASSED"
echo "==================================="
echo ""
echo "Completed workflows:"
echo "  ✓ CREATE → BURN"
echo "  ✓ CREATE → REVOKE"
echo "  ✓ CREATE → RENEW"
echo "  ✓ CREATE → RENEW → BURN"
echo ""
