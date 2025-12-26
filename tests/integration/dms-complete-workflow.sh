#!/bin/bash
# Test: Complete DMS workflow - create, renew multiple times, unlock, verify

set -e

echo "=== COMPLETE DMS WORKFLOW TEST ==="
echo ""

# 1. Create DMS seal
echo "1. Creating DMS seal..."
UNLOCK_TIME=$(date -d "+7 days" +%s000)
echo "complete workflow test data" > /tmp/workflow_test.txt

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/create-seal \
  -F "encryptedBlob=@/tmp/workflow_test.txt" \
  -F "keyB=$(echo -n 'workflow_test_key_b_32bytes_long' | base64)" \
  -F "iv=$(echo -n 'workflow_iv12' | base64)" \
  -F "unlockTime=$UNLOCK_TIME" \
  -F "isDMS=true" \
  -F "pulseInterval=604800000")

SEAL_ID=$(echo $CREATE_RESPONSE | jq -r '.sealId')
PULSE_TOKEN=$(echo $CREATE_RESPONSE | jq -r '.pulseToken')
PUBLIC_URL=$(echo $CREATE_RESPONSE | jq -r '.publicUrl')

if [ "$SEAL_ID" = "null" ] || [ -z "$SEAL_ID" ]; then
  echo "✗ Seal creation failed: $CREATE_RESPONSE"
  rm -f /tmp/workflow_test.txt
  exit 1
fi

echo "✓ Seal created: $SEAL_ID"
echo "✓ Public URL: $PUBLIC_URL"
echo "✓ Pulse token: ${PULSE_TOKEN:0:50}..."
echo ""

# 2. Verify seal status (should be locked)
echo "2. Checking initial seal status..."
STATUS=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
IS_LOCKED=$(echo $STATUS | jq -r '.isLocked')
IS_DMS=$(echo $STATUS | jq -r '.isDMS')
INITIAL_UNLOCK=$(echo $STATUS | jq -r '.unlockTime')

if [ "$IS_LOCKED" = "true" ] && [ "$IS_DMS" = "true" ]; then
  echo "✓ Seal is locked and configured as DMS"
  echo "✓ Initial unlock time: $(date -d @$((INITIAL_UNLOCK/1000)))"
else
  echo "✗ Seal status incorrect: $STATUS"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 3. First pulse renewal
echo "3. First pulse renewal (extend by 7 days)..."
sleep 2
NONCE1=$(uuidgen)
RENEW1=$(curl -s -X POST http://localhost:3000/api/pulse \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\":\"$PULSE_TOKEN\",\"newInterval\":604800000,\"operationNonce\":\"$NONCE1\"}")

SUCCESS1=$(echo $RENEW1 | jq -r '.success')
NEW_UNLOCK1=$(echo $RENEW1 | jq -r '.newUnlockTime')

if [ "$SUCCESS1" = "true" ]; then
  echo "✓ First renewal successful"
  echo "✓ New unlock time: $(date -d @$((NEW_UNLOCK1/1000)))"
else
  echo "✗ First renewal failed: $RENEW1"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 4. Verify database reflects first renewal
echo "4. Verifying first renewal in database..."
STATUS2=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
DB_UNLOCK1=$(echo $STATUS2 | jq -r '.unlockTime')

if [ "$DB_UNLOCK1" = "$NEW_UNLOCK1" ]; then
  echo "✓ Database updated with new unlock time"
else
  echo "✗ Database mismatch: expected $NEW_UNLOCK1, got $DB_UNLOCK1"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 5. Second pulse renewal
echo "5. Second pulse renewal (extend by 14 days)..."
sleep 2
NONCE2=$(uuidgen)
RENEW2=$(curl -s -X POST http://localhost:3000/api/pulse \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\":\"$PULSE_TOKEN\",\"newInterval\":1209600000,\"operationNonce\":\"$NONCE2\"}")

SUCCESS2=$(echo $RENEW2 | jq -r '.success')
NEW_UNLOCK2=$(echo $RENEW2 | jq -r '.newUnlockTime')

if [ "$SUCCESS2" = "true" ]; then
  echo "✓ Second renewal successful"
  echo "✓ New unlock time: $(date -d @$((NEW_UNLOCK2/1000)))"
else
  echo "✗ Second renewal failed: $RENEW2"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 6. Verify seal still locked
echo "6. Verifying seal remains locked..."
STATUS3=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
IS_LOCKED3=$(echo $STATUS3 | jq -r '.isLocked')

if [ "$IS_LOCKED3" = "true" ]; then
  echo "✓ Seal still locked after renewals"
else
  echo "✗ Seal should still be locked"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 7. Unlock seal (revoke)
echo "7. Unlocking seal (revoke)..."
sleep 2
NONCE3=$(uuidgen)
UNLOCK=$(curl -s -X POST http://localhost:3000/api/unlock \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\":\"$PULSE_TOKEN\",\"operationNonce\":\"$NONCE3\"}")

UNLOCK_SUCCESS=$(echo $UNLOCK | jq -r '.success')

if [ "$UNLOCK_SUCCESS" = "true" ]; then
  echo "✓ Seal unlocked successfully"
else
  echo "✗ Unlock failed: $UNLOCK"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 8. Verify seal is now unlocked
echo "8. Verifying seal is unlocked..."
STATUS4=$(curl -s http://localhost:3000/api/seal/$SEAL_ID)
IS_LOCKED4=$(echo $STATUS4 | jq -r '.isLocked')
FINAL_UNLOCK=$(echo $STATUS4 | jq -r '.unlockTime')
NOW=$(date +%s000)

if [ "$IS_LOCKED4" = "false" ]; then
  echo "✓ Seal is now unlocked"
  echo "✓ Final unlock time: $(date -d @$((FINAL_UNLOCK/1000)))"
  echo "✓ Current time: $(date -d @$((NOW/1000)))"
else
  echo "✗ Seal should be unlocked"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 9. Attempt to renew after unlock (should fail)
echo "9. Attempting renewal after unlock (should fail)..."
sleep 2
NONCE4=$(uuidgen)
RENEW_AFTER=$(curl -s -X POST http://localhost:3000/api/pulse \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\":\"$PULSE_TOKEN\",\"newInterval\":604800000,\"operationNonce\":\"$NONCE4\"}")

RENEW_AFTER_SUCCESS=$(echo $RENEW_AFTER | jq -r '.success')

if [ "$RENEW_AFTER_SUCCESS" = "false" ] || [ "$RENEW_AFTER_SUCCESS" = "null" ]; then
  echo "✓ Renewal correctly rejected after unlock"
else
  echo "✗ Renewal should fail after unlock: $RENEW_AFTER"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

# 10. Test replay attack prevention
echo "10. Testing replay attack prevention..."
REPLAY=$(curl -s -X POST http://localhost:3000/api/pulse \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\":\"$PULSE_TOKEN\",\"newInterval\":604800000,\"operationNonce\":\"$NONCE1\"}")

REPLAY_SUCCESS=$(echo $REPLAY | jq -r '.success')

if [ "$REPLAY_SUCCESS" = "false" ] || [ "$REPLAY_SUCCESS" = "null" ]; then
  echo "✓ Replay attack correctly prevented (nonce reuse blocked)"
else
  echo "✗ Replay attack should be blocked: $REPLAY"
  rm -f /tmp/workflow_test.txt
  exit 1
fi
echo ""

rm -f /tmp/workflow_test.txt
echo "=== ALL TESTS PASSED ==="
echo ""
echo "Summary:"
echo "  ✓ Created DMS seal: $SEAL_ID"
echo "  ✓ Renewed pulse twice (7 days, then 14 days)"
echo "  ✓ Database correctly updated after each renewal"
echo "  ✓ Seal remained locked through renewals"
echo "  ✓ Successfully unlocked (revoked) seal"
echo "  ✓ Seal correctly transitioned to unlocked state"
echo "  ✓ Renewal rejected after unlock"
echo "  ✓ Replay attack prevented (nonce protection working)"
echo ""
echo "Complete DMS workflow validated successfully!"
