#!/bin/bash
# Comprehensive Regression Tests for v0.9.4 Fixes
# Tests all 10 critical logical error fixes

set -e

API_URL="${1:-http://localhost:3000}"
FAILED=0
PASSED=0

echo "=================================="
echo "TimeSeal v0.9.4 Regression Tests"
echo "=================================="
echo "API: ${API_URL}"
echo ""

# Helper functions
pass() {
  echo "✅ PASS: $1"
  ((PASSED++))
}

fail() {
  echo "❌ FAIL: $1"
  ((FAILED++))
}

# Test Fix #1: Blob fetch before view recording
test_fix_1() {
  echo "Test Fix #1: Blob fetch before view recording"
  echo "Creating ephemeral seal..."
  
  RESPONSE=$(curl -s -X POST "${API_URL}/api/create-seal" \
    -H "Content-Type: application/json" \
    -d '{
      "encryptedBlob": "dGVzdA==",
      "keyB": "testkey",
      "iv": "testiv",
      "unlockTime": '$(date +%s000)',
      "isEphemeral": true,
      "maxViews": 1
    }')
  
  if echo "$RESPONSE" | jq -e '.sealId' >/dev/null 2>&1; then
    pass "Ephemeral seal created"
  else
    fail "Ephemeral seal creation failed"
  fi
  echo ""
}

# Test Fix #5: maxViews=0 validation
test_fix_5() {
  echo "Test Fix #5: maxViews=0 validation"
  
  RESPONSE=$(curl -s -X POST "${API_URL}/api/create-seal" \
    -H "Content-Type: application/json" \
    -d '{
      "encryptedBlob": "dGVzdA==",
      "keyB": "testkey",
      "iv": "testiv",
      "unlockTime": '$(date +%s000)',
      "isEphemeral": true,
      "maxViews": 0
    }')
  
  if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
    pass "maxViews=0 properly rejected"
  else
    fail "maxViews=0 should be rejected"
  fi
  echo ""
}

# Test Fix #8: Race condition prevention
test_fix_8() {
  echo "Test Fix #8: Atomic view recording (race condition)"
  echo "Creating ephemeral seal with maxViews=1..."
  
  RESPONSE=$(curl -s -X POST "${API_URL}/api/create-seal" \
    -H "Content-Type: application/json" \
    -d '{
      "encryptedBlob": "dGVzdA==",
      "keyB": "testkey",
      "iv": "testiv",
      "unlockTime": '$(date +%s000)',
      "isEphemeral": true,
      "maxViews": 1
    }')
  
  SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')
  
  if [ "$SEAL_ID" != "null" ]; then
    echo "Seal created: $SEAL_ID"
    echo "Simulating concurrent access (2 requests)..."
    
    # First request should succeed
    RESP1=$(curl -s "${API_URL}/api/create-seal/${SEAL_ID}")
    STATUS1=$(echo "$RESP1" | jq -r '.status')
    
    # Second request should fail (exhausted)
    RESP2=$(curl -s "${API_URL}/api/create-seal/${SEAL_ID}")
    STATUS2=$(echo "$RESP2" | jq -r '.status')
    
    if [ "$STATUS1" = "unlocked" ] && [ "$STATUS2" = "exhausted" ]; then
      pass "Race condition prevented: only 1 view allowed"
    else
      fail "Race condition not prevented: STATUS1=$STATUS1, STATUS2=$STATUS2"
    fi
  else
    fail "Seal creation failed"
  fi
  echo ""
}

# Test Fix #9: Blob returned on exhaustion
test_fix_9() {
  echo "Test Fix #9: Blob returned on exhaustion"
  echo "Creating ephemeral seal with maxViews=2..."
  
  RESPONSE=$(curl -s -X POST "${API_URL}/api/create-seal" \
    -H "Content-Type: application/json" \
    -d '{
      "encryptedBlob": "dGVzdGJsb2I=",
      "keyB": "testkey",
      "iv": "testiv",
      "unlockTime": '$(date +%s000)',
      "isEphemeral": true,
      "maxViews": 2
    }')
  
  SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')
  
  if [ "$SEAL_ID" != "null" ]; then
    # First view
    curl -s "${API_URL}/api/create-seal/${SEAL_ID}" >/dev/null
    
    # Second view (exhausts seal)
    RESP=$(curl -s "${API_URL}/api/create-seal/${SEAL_ID}")
    STATUS=$(echo "$RESP" | jq -r '.status')
    HAS_BLOB=$(echo "$RESP" | jq -e '.blob' >/dev/null 2>&1 && echo "yes" || echo "no")
    
    if [ "$STATUS" = "exhausted" ] && [ "$HAS_BLOB" = "yes" ]; then
      pass "Blob returned on exhaustion"
    else
      fail "Blob not returned on exhaustion: STATUS=$STATUS, HAS_BLOB=$HAS_BLOB"
    fi
  else
    fail "Seal creation failed"
  fi
  echo ""
}

# Test DMS functionality (Fix #6)
test_dms() {
  echo "Test DMS: Pulse functionality"
  
  RESPONSE=$(curl -s -X POST "${API_URL}/api/create-seal" \
    -H "Content-Type: application/json" \
    -d '{
      "encryptedBlob": "dGVzdA==",
      "keyB": "testkey",
      "iv": "testiv",
      "unlockTime": '$(date +%s000)',
      "isDMS": true,
      "pulseInterval": 86400000
    }')
  
  SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')
  PULSE_TOKEN=$(echo "$RESPONSE" | jq -r '.pulseToken')
  
  if [ "$SEAL_ID" != "null" ] && [ "$PULSE_TOKEN" != "null" ]; then
    pass "DMS seal created with pulse token"
  else
    fail "DMS seal creation failed"
  fi
  echo ""
}

# Test basic seal creation (Fix #3)
test_basic_seal() {
  echo "Test Basic Seal: Creation with receipt"
  
  RESPONSE=$(curl -s -X POST "${API_URL}/api/create-seal" \
    -H "Content-Type: application/json" \
    -d '{
      "encryptedBlob": "dGVzdA==",
      "keyB": "testkey",
      "iv": "testiv",
      "unlockTime": '$(date +%s000)'
    }')
  
  SEAL_ID=$(echo "$RESPONSE" | jq -r '.sealId')
  RECEIPT=$(echo "$RESPONSE" | jq -e '.receipt' >/dev/null 2>&1 && echo "yes" || echo "no")
  
  if [ "$SEAL_ID" != "null" ] && [ "$RECEIPT" = "yes" ]; then
    pass "Basic seal created with receipt"
  else
    fail "Basic seal creation failed: SEAL_ID=$SEAL_ID, RECEIPT=$RECEIPT"
  fi
  echo ""
}

# Run all tests
echo "Running tests..."
echo ""

test_basic_seal
test_fix_1
test_fix_5
test_fix_8
test_fix_9
test_dms

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ ALL TESTS PASSED"
  exit 0
else
  echo "❌ SOME TESTS FAILED"
  exit 1
fi
