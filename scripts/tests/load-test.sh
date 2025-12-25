#!/bin/bash
set -e

API_URL="${1:-http://localhost:3000}"
CONCURRENT_USERS="${2:-100}"
DURATION="${3:-60}"

echo "Load Testing TimeSeal"
echo "API: $API_URL"
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Duration: ${DURATION}s"
echo ""

# Check if artillery is installed
if ! command -v artillery &> /dev/null; then
  echo "Installing artillery..."
  npm install -g artillery
fi

# Create artillery config
cat > /tmp/load-test.yml << EOF
config:
  target: "$API_URL"
  phases:
    - duration: 10
      arrivalRate: 5
      name: "Warm up"
    - duration: $DURATION
      arrivalRate: $CONCURRENT_USERS
      name: "Load test"
  processor: "./load-test-processor.js"

scenarios:
  - name: "Create and access seal"
    flow:
      - post:
          url: "/api/create-seal"
          formData:
            encryptedBlob: "{{ \$randomString() }}"
            keyB: "{{ \$randomString() }}"
            iv: "{{ \$randomString() }}"
            unlockTime: "{{ \$timestamp() }}"
          capture:
            - json: "$.sealId"
              as: "sealId"
      - get:
          url: "/api/seal/{{ sealId }}"
          
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
EOF

echo "Running load test..."
artillery run /tmp/load-test.yml

rm /tmp/load-test.yml
echo ""
echo "Load test complete"
