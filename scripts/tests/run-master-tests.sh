#!/bin/bash
# Master Test Runner for TimeSeal
# Runs all test categories and generates comprehensive report

set -e

cd "$(dirname "$0")/../.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).txt"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   TimeSeal Master Test Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Initialize counters
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Test suite runner
run_suite() {
    local name="$1"
    local command="$2"
    local required="$3"
    
    ((TOTAL_SUITES++))
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test Suite: $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if eval "$command" 2>&1 | tee -a "$REPORT_FILE"; then
        echo -e "${GREEN}✅ $name: PASSED${NC}"
        ((PASSED_SUITES++))
        echo ""
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ $name: FAILED (REQUIRED)${NC}"
            ((FAILED_SUITES++))
        else
            echo -e "${YELLOW}⚠️  $name: FAILED (OPTIONAL)${NC}"
        fi
        echo ""
        return 1
    fi
}

# Start report
{
    echo "TimeSeal Test Report"
    echo "===================="
    echo "Date: $(date)"
    echo "Host: $(hostname)"
    echo "User: $(whoami)"
    echo ""
} > "$REPORT_FILE"

# Test Suite 1: Shell Script Validation
run_suite "Shell Script Validation" \
    "bash scripts/tests/validate-all.sh" \
    "true"

# Test Suite 2: TypeScript Type Checking
run_suite "TypeScript Type Check" \
    "npx tsc --noEmit" \
    "true"

# Test Suite 3: ESLint
run_suite "ESLint" \
    "npm run lint" \
    "true"

# Test Suite 4: Unit Tests (if they exist)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    run_suite "Unit Tests" \
        "npm test" \
        "false"
fi

# Test Suite 5: Security Hardening Check
if [ -f "scripts/test-hardening.sh" ]; then
    run_suite "Security Hardening" \
        "bash scripts/test-hardening.sh" \
        "false"
fi

# Summary
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Summary                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Total Test Suites: $TOTAL_SUITES"
echo -e "${GREEN}Passed: $PASSED_SUITES${NC}"
echo -e "${RED}Failed: $FAILED_SUITES${NC}"
echo ""

{
    echo ""
    echo "===================="
    echo "Summary"
    echo "===================="
    echo "Total: $TOTAL_SUITES"
    echo "Passed: $PASSED_SUITES"
    echo "Failed: $FAILED_SUITES"
} >> "$REPORT_FILE"

echo "Full report saved to: $REPORT_FILE"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}✅ All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_SUITES test suite(s) failed${NC}"
    exit 1
fi
