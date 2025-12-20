#!/bin/bash
# Automated Security Test Suite for Time-Seal

set -e

BASE_URL=${1:-"http://localhost:3000"}
RESULTS_FILE="security-test-results.txt"

echo "🔒 Time-Seal Security Testing Suite" | tee $RESULTS_FILE
echo "====================================" | tee -a $RESULTS_FILE
echo "Target: $BASE_URL" | tee -a $RESULTS_FILE
echo "Date: $(date)" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

PASS_COUNT=0
FAIL_COUNT=0

# Helper function
test_result() {
  if [ $1 -eq 0 ]; then
    echo "✅ PASS" | tee -a $RESULTS_FILE
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "❌ FAIL" | tee -a $RESULTS_FILE
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

# Test 1: Rate Limiting
echo "Test 1: Rate Limiting (DOS Protection)" | tee -a $RESULTS_FILE
RATE_LIMIT_HITS=0
for i in {1..15}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/create-seal \
    -H "Content-Type: application/json" \
    -d '{"test":"data"}')
  if [ "$STATUS" = "429" ]; then
    RATE_LIMIT_HITS=$((RATE_LIMIT_HITS + 1))
  fi
  sleep 0.1
done
echo "  Rate limit triggered: $RATE_LIMIT_HITS/15 requests" | tee -a $RESULTS_FILE
[ $RATE_LIMIT_HITS -gt 0 ]
test_result $?

# Test 2: Invalid Input Rejection
echo "" | tee -a $RESULTS_FILE
echo "Test 2: Invalid Input Rejection" | tee -a $RESULTS_FILE
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/create-seal \
  -H "Content-Type: application/json" \
  -d '{"unlockTime": 1000}')
echo "  Status code: $STATUS" | tee -a $RESULTS_FILE
[ "$STATUS" = "400" ]
test_result $?

# Test 3: SQL Injection Protection
echo "" | tee -a $RESULTS_FILE
echo "Test 3: SQL Injection Protection" | tee -a $RESULTS_FILE
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/seal/'; DROP TABLE seals;--")
echo "  Status code: $STATUS" | tee -a $RESULTS_FILE
[ "$STATUS" != "500" ]
test_result $?

# Test 4: XSS Protection
echo "" | tee -a $RESULTS_FILE
echo "Test 4: XSS Protection" | tee -a $RESULTS_FILE
RESPONSE=$(curl -s -X POST $BASE_URL/api/create-seal \
  -H "Content-Type: application/json" \
  -d '{"keyB":"<script>alert(1)</script>"}')
echo "  Response contains script tag: $(echo $RESPONSE | grep -c '<script>' || echo 0)" | tee -a $RESULTS_FILE
! echo "$RESPONSE" | grep -q '<script>'
test_result $?

# Test 5: Health Check
echo "" | tee -a $RESULTS_FILE
echo "Test 5: Health Check Endpoint" | tee -a $RESULTS_FILE
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
echo "  Status code: $STATUS" | tee -a $RESULTS_FILE
[ "$STATUS" = "200" ]
test_result $?

# Test 6: Metrics Endpoint
echo "" | tee -a $RESULTS_FILE
echo "Test 6: Metrics Endpoint" | tee -a $RESULTS_FILE
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/metrics)
echo "  Status code: $STATUS" | tee -a $RESULTS_FILE
[ "$STATUS" = "200" ]
test_result $?

# Test 7: CORS Headers
echo "" | tee -a $RESULTS_FILE
echo "Test 7: CORS Configuration" | tee -a $RESULTS_FILE
CORS=$(curl -s -I -H "Origin: https://evil.com" $BASE_URL/api/health | grep -i "access-control" || echo "none")
echo "  CORS headers: $CORS" | tee -a $RESULTS_FILE
[ "$CORS" != "none" ]
test_result $?

# Test 8: Unsupported HTTP Methods
echo "" | tee -a $RESULTS_FILE
echo "Test 8: Unsupported HTTP Methods" | tee -a $RESULTS_FILE
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE $BASE_URL/api/seal/test)
echo "  DELETE status: $STATUS" | tee -a $RESULTS_FILE
[ "$STATUS" = "405" ] || [ "$STATUS" = "404" ]
test_result $?

# Summary
echo "" | tee -a $RESULTS_FILE
echo "=====================================" | tee -a $RESULTS_FILE
echo "Summary:" | tee -a $RESULTS_FILE
echo "  Passed: $PASS_COUNT" | tee -a $RESULTS_FILE
echo "  Failed: $FAIL_COUNT" | tee -a $RESULTS_FILE
echo "  Total:  $((PASS_COUNT + FAIL_COUNT))" | tee -a $RESULTS_FILE
echo "" | tee -a $RESULTS_FILE

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ All security tests passed!" | tee -a $RESULTS_FILE
  exit 0
else
  echo "❌ Some security tests failed. Review $RESULTS_FILE" | tee -a $RESULTS_FILE
  exit 1
fi
