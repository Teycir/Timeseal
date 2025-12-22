#!/bin/bash
# Test hardening components

echo "🧪 Testing TimeSeal Hardening Components"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASS=0
FAIL=0

test_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        ((FAIL++))
    fi
}

test_import() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 imports $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 missing import $2"
        ((FAIL++))
    fi
}

echo "📁 Checking files..."
test_file "lib/memoryProtection.ts"
test_file "lib/extensionDetection.ts"
test_file "lib/timeAttestation.ts"
test_file "lib/canaryMonitor.ts"
test_file "components/SecurityDashboard.tsx"
test_file "public/canary.txt"
test_file "docs/HARDENING.md"
test_file "docs/SELF-HOSTING.md"
test_file "docs/TRANSPARENCY-REPORT-TEMPLATE.md"

echo ""
echo "🔗 Checking integrations..."
test_import "lib/crypto.ts" "SecureMemory"
test_import "app/layout.tsx" "SecurityDashboard"

echo ""
echo "🌐 Testing endpoints..."

# Test canary endpoint
if curl -s http://localhost:3000/canary.txt | grep -q "Warrant Canary"; then
    echo -e "${GREEN}✓${NC} /canary.txt accessible"
    ((PASS++))
else
    echo -e "${RED}✗${NC} /canary.txt not accessible (start dev server)"
    ((FAIL++))
fi

echo ""
echo "📊 Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
