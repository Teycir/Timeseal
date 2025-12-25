#!/bin/bash
set -e

PORT=3000
MAX_PORT=3010

# Find available port
while [ $PORT -le $MAX_PORT ]; do
  if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port $PORT in use, killing..."
    kill -9 $(lsof -t -i:$PORT) 2>/dev/null || true
    sleep 1
  fi
  
  if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Using port $PORT"
    break
  fi
  
  PORT=$((PORT + 1))
done

if [ $PORT -gt $MAX_PORT ]; then
  echo "No available ports"
  exit 1
fi

# Start server
API_URL="http://localhost:$PORT"
PORT=$PORT npm run dev > /tmp/timeseal-test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for health
for i in {1..30}; do
  if curl -s "$API_URL/api/health" >/dev/null 2>&1; then
    echo "Server ready"
    sleep 2
    break
  fi
  sleep 1
done

# Create DMS seal AFTER server is ready
UNLOCK_TIME=$(($(date +%s) * 1000 + 86400000))
TEMP_FILE=$(mktemp)
echo "DMS Test" > "$TEMP_FILE"
KEY_B=$(openssl rand -base64 32 | tr -d '\n')
IV=$(openssl rand -base64 12 | tr -d '\n')

RESPONSE=$(curl -s -X POST "$API_URL/api/create-seal" \
  -F "encryptedBlob=@$TEMP_FILE" \
  -F "keyB=$KEY_B" \
  -F "iv=$IV" \
  -F "unlockTime=$UNLOCK_TIME" \
  -F "isDMS=true" \
  -F "pulseInterval=3600000")

rm "$TEMP_FILE"
echo "Seal creation response:"
echo "$RESPONSE" | jq .
PULSE_TOKEN=$(echo "$RESPONSE" | jq -r '.pulseToken')
echo "Pulse token: $PULSE_TOKEN"

echo ""
echo "=== Test 1: DMS Early Unlock ==="
bash scripts/tests/test-dms-unlock.sh "$API_URL" "$PULSE_TOKEN"

echo ""
echo "=== Test 2: Ephemeral Exhaustion (1 view) ==="
bash scripts/tests/test-ephemeral-exhaustion.sh "$API_URL" 1

echo ""
echo "=== Test 3: Ephemeral Exhaustion (3 views) ==="
bash scripts/tests/test-ephemeral-exhaustion.sh "$API_URL" 3

# Cleanup
kill $SERVER_PID 2>/dev/null || true
rm -f /tmp/timeseal-test.log
echo ""
echo "All tests complete"
