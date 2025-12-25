#!/bin/bash
set -e

API_URL="${1:-http://localhost:3000}"
PULSE_TOKEN="${2}"

if [ -z "$PULSE_TOKEN" ]; then
  echo "Usage: $0 [API_URL] PULSE_TOKEN"
  exit 1
fi

echo "Testing DMS early unlock on $API_URL"

# URL encode the pulse token
ENCODED_TOKEN=$(echo -n "$PULSE_TOKEN" | jq -sRr @uri)

RESPONSE=$(curl -s -X POST "$API_URL/api/unlock" \
  -H "Content-Type: application/json" \
  -d "{\"pulseToken\":\"$PULSE_TOKEN\"}")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo ""
  echo "✓ DMS seal unlocked early successfully"
else
  echo ""
  echo "✗ DMS early unlock failed"
  exit 1
fi
