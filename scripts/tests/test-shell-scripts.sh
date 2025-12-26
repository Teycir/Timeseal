#!/bin/bash
# Comprehensive Shell Script Test Suite for TimeSeal
# Tests all .sh files for syntax, structure, and best practices

set -euo pipefail

cd "$(dirname "$0")/../.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL=0
PASS=0
FAIL=0
WARN=0

# Arrays to track results
declare -a FAILED_SCRIPTS
declare -a WARNING_SCRIPTS

echo -e "${BLUE}🧪 TimeSeal Shell Script Test Suite${NC}"
echo "===================================="
echo ""

# Test functions
test_syntax() {
    local script="$1"
    if bash -n "$script" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

test_shebang() {
    local script="$1"
    local first_line=$(head -n1 "$script")
    if [[ "$first_line" == "#!/bin/bash"* ]]; then
        return 0
    else
        return 1
    fi
}

test_set_e() {
    local script="$1"
    if grep -q "^set -e" "$script" || grep -q "^set -euo pipefail" "$script"; then
        return 0
    else
        return 1
    fi
}

# Find all shell scripts (excluding history and node_modules)
echo "📁 Finding shell scripts..."
mapfile -t SCRIPTS < <(find . -name "*.sh" \
    -not -path "./.history/*" \
    -not -path "./node_modules/*" \
    -not -path "./.next/*" \
    -not -path "./.open-next/*" \
    -type f | sort)

echo "Found ${#SCRIPTS[@]} shell scripts"
echo ""

# Test each script
for script in "${SCRIPTS[@]}"; do
    ((TOTAL++))
    script_name=$(basename "$script")
    script_pass=true
    
    echo -n "Testing $script ... "
    
    # Test 1: Syntax
    if ! test_syntax "$script"; then
        echo -e "${RED}SYNTAX ERROR${NC}"
        FAILED_SCRIPTS+=("$script: Syntax error")
        ((FAIL++))
        continue
    fi
    
    # Test 2: Shebang
    if ! test_shebang "$script"; then
        echo -e "${YELLOW}WARNING: Missing/incorrect shebang${NC}"
        WARNING_SCRIPTS+=("$script: No proper shebang")
        ((WARN++))
        script_pass=false
    fi
    
    # Test 3: Error handling
    if ! test_set_e "$script"; then
        echo -e "${YELLOW}WARNING: No 'set -e'${NC}"
        WARNING_SCRIPTS+=("$script: No error handling")
        ((WARN++))
        script_pass=false
    fi
    
    # Test 4: Executable permission
    if [ ! -x "$script" ]; then
        chmod +x "$script" 2>/dev/null || true
        if [ -x "$script" ]; then
            echo -e "${GREEN}OK${NC} (fixed permissions)"
        else
            echo -e "${YELLOW}WARNING: Not executable${NC}"
            script_pass=false
        fi
    else
        if $script_pass; then
            echo -e "${GREEN}OK${NC}"
        fi
    fi
    
    if $script_pass && [ -x "$script" ]; then
        ((PASS++))
    fi
done

echo ""
echo "===================================="
echo -e "${BLUE}📊 Test Results${NC}"
echo "===================================="
echo -e "Total scripts:    $TOTAL"
echo -e "${GREEN}Passed:${NC}           $PASS"
echo -e "${RED}Failed:${NC}           $FAIL"
echo -e "${YELLOW}Warnings:${NC}         $WARN"
echo ""

# Show failures
if [ ${#FAILED_SCRIPTS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed Scripts:${NC}"
    for item in "${FAILED_SCRIPTS[@]}"; do
        echo "  - $item"
    done
    echo ""
fi

# Show warnings
if [ ${#WARNING_SCRIPTS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings:${NC}"
    for item in "${WARNING_SCRIPTS[@]}"; do
        echo "  - $item"
    done
    echo ""
fi

# Dependency check
echo "===================================="
echo -e "${BLUE}🔧 Dependency Check${NC}"
echo "===================================="

check_dep() {
    local cmd="$1"
    local required="$2"
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $cmd"
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $cmd (REQUIRED)"
        else
            echo -e "${YELLOW}⚠${NC} $cmd (optional)"
        fi
    fi
}

check_dep "bash" "true"
check_dep "curl" "true"
check_dep "jq" "true"
check_dep "openssl" "true"
check_dep "npm" "true"
check_dep "node" "true"
check_dep "wrangler" "false"
check_dep "gpg" "false"
check_dep "tar" "false"
check_dep "artillery" "false"

echo ""

# Final result
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All scripts passed syntax validation!${NC}"
    if [ $WARN -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARN warnings found (non-critical)${NC}"
    fi
    exit 0
else
    echo -e "${RED}❌ $FAIL scripts failed validation${NC}"
    exit 1
fi
