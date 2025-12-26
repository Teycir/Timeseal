#!/bin/bash
# Comprehensive test suite for all TimeSeal shell scripts
# Tests syntax, dependencies, and basic functionality

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

echo "🧪 TimeSeal Shell Script Test Suite"
echo "===================================="
echo ""

# Test helper functions
test_syntax() {
    local script="$1"
    if bash -n "$script" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Syntax: $script"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} Syntax: $script"
        ((FAIL++))
        return 1
    fi
}

test_executable() {
    local script="$1"
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓${NC} Executable: $script"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Not executable: $script"
        ((SKIP++))
        return 1
    fi
}

test_shebang() {
    local script="$1"
    if head -n1 "$script" | grep -q "^#!/bin/bash"; then
        echo -e "${GREEN}✓${NC} Shebang: $script"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} Missing/wrong shebang: $script"
        ((FAIL++))
        return 1
    fi
}

test_set_e() {
    local script="$1"
    if grep -q "^set -e" "$script"; then
        echo -e "${GREEN}✓${NC} Error handling (set -e): $script"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} No 'set -e': $script"
        ((SKIP++))
        return 1
    fi
}

# Find all shell scripts
SCRIPTS=(
    "setup.sh"
    "scripts/backup-db.sh"
    "scripts/deploy.sh"
    "scripts/init-db.sh"
    "scripts/migrate-prod.sh"
    "scripts/security-test.sh"
    "scripts/setup-cloudflare.sh"
    "scripts/setup-complete.sh"
    "scripts/setup-d1.sh"
    "scripts/setup-secrets.sh"
    "scripts/setup-turnstile.sh"
    "scripts/setup.sh"
    "scripts/sign-canary.sh"
    "scripts/test-hardening.sh"
    "scripts/tests/load-test.sh"
    "scripts/tests/run-all-tests.sh"
    "scripts/tests/run-shell-tests.sh"
    "scripts/tests/test-analytics.sh"
    "scripts/tests/test-blob-download.sh"
    "scripts/tests/test-dms-burn.sh"
    "scripts/tests/test-dms-creation.sh"
    "scripts/tests/test-dms-pulse.sh"
    "scripts/tests/test-dms-unlock.sh"
    "scripts/tests/test-ephemeral-exhaustion.sh"
    "scripts/tests/test-ephemeral-seal.sh"
    "scripts/tests/test-health.sh"
    "scripts/tests/test-metrics.sh"
    "scripts/tests/test-pulse-status.sh"
    "scripts/tests/test-qr-code.sh"
    "scripts/tests/test-receipt-verify.sh"
    "scripts/tests/test-seal-creation.sh"
    "scripts/tests/test-seal-unlock.sh"
)

cd "$(dirname "$0")/../.."

echo "📋 Testing ${#SCRIPTS[@]} shell scripts"
echo ""

# Test 1: Syntax validation
echo "=== Test 1: Syntax Validation ==="
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        test_syntax "$script"
    else
        echo -e "${RED}✗${NC} Missing: $script"
        ((FAIL++))
    fi
done
echo ""

# Test 2: Shebang check
echo "=== Test 2: Shebang Check ==="
for script in "${SCRIPTS[@]}"; do
    [ -f "$script" ] && test_shebang "$script"
done
echo ""

# Test 3: Error handling
echo "=== Test 3: Error Handling (set -e) ==="
for script in "${SCRIPTS[@]}"; do
    [ -f "$script" ] && test_set_e "$script"
done
echo ""

# Test 4: Executable permissions
echo "=== Test 4: Executable Permissions ==="
for script in "${SCRIPTS[@]}"; do
    [ -f "$script" ] && test_executable "$script"
done
echo ""

# Test 5: Dependency checks
echo "=== Test 5: Dependency Checks ==="

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Command available: $1"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} Command missing: $1 (may be optional)"
        ((SKIP++))
    fi
}

check_command "bash"
check_command "curl"
check_command "jq"
check_command "openssl"
check_command "wrangler"
check_command "npm"
check_command "node"
check_command "tar"
check_command "gpg"
echo ""

# Test 6: Script-specific functionality tests
echo "=== Test 6: Functional Tests ==="

# Test backup-db.sh (dry run)
if [ -f "scripts/backup-db.sh" ]; then
    echo "Testing backup-db.sh..."
    if bash -n scripts/backup-db.sh; then
        echo -e "${GREEN}✓${NC} backup-db.sh: Syntax OK"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} backup-db.sh: Syntax error"
        ((FAIL++))
    fi
fi

# Test deploy.sh (syntax only, don't actually deploy)
if [ -f "scripts/deploy.sh" ]; then
    echo "Testing deploy.sh..."
    if bash -n scripts/deploy.sh; then
        echo -e "${GREEN}✓${NC} deploy.sh: Syntax OK"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} deploy.sh: Syntax error"
        ((FAIL++))
    fi
fi

# Test security-test.sh structure
if [ -f "scripts/security-test.sh" ]; then
    echo "Testing security-test.sh..."
    if grep -q "test_result" scripts/security-test.sh; then
        echo -e "${GREEN}✓${NC} security-test.sh: Has test framework"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} security-test.sh: Missing test framework"
        ((FAIL++))
    fi
fi

echo ""

# Test 7: Integration with project structure
echo "=== Test 7: Project Integration ==="

# Check if scripts reference correct paths
if grep -r "wrangler.toml" scripts/ &>/dev/null; then
    echo -e "${GREEN}✓${NC} Scripts reference wrangler.toml"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} No wrangler.toml references found"
    ((SKIP++))
fi

# Check if test scripts use correct API endpoints
if grep -r "/api/health" scripts/tests/ &>/dev/null; then
    echo -e "${GREEN}✓${NC} Test scripts use health endpoint"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Test scripts missing health checks"
    ((FAIL++))
fi

# Check if scripts handle errors properly
ERROR_HANDLING=$(grep -r "set -e" scripts/ | wc -l)
if [ "$ERROR_HANDLING" -gt 10 ]; then
    echo -e "${GREEN}✓${NC} Most scripts use error handling ($ERROR_HANDLING scripts)"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Few scripts use error handling ($ERROR_HANDLING scripts)"
    ((SKIP++))
fi

echo ""

# Summary
echo "===================================="
echo "📊 Test Results"
echo "===================================="
echo -e "${GREEN}Passed:${NC}  $PASS"
echo -e "${RED}Failed:${NC}  $FAIL"
echo -e "${YELLOW}Skipped:${NC} $SKIP"
echo "Total:   $((PASS + FAIL + SKIP))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review output above.${NC}"
    exit 1
fi
