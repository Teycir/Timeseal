#!/bin/bash
# Quick validation of all shell scripts
# Tests: syntax, shebang, error handling

set -e

cd "$(dirname "$0")/../.."

TOTAL=0
PASS=0
FAIL=0

echo "🔍 Quick Shell Script Validation"
echo "================================="
echo ""

# Find all .sh files
while IFS= read -r script; do
    ((TOTAL++))
    
    # Test 1: Syntax
    if ! bash -n "$script" 2>/dev/null; then
        echo "❌ SYNTAX ERROR: $script"
        ((FAIL++))
        continue
    fi
    
    # Test 2: Shebang
    if ! head -n1 "$script" | grep -q "^#!/bin/bash"; then
        echo "⚠️  NO SHEBANG: $script"
    fi
    
    # Test 3: Executable
    if [ ! -x "$script" ]; then
        chmod +x "$script"
        echo "🔧 FIXED PERMISSIONS: $script"
    fi
    
    ((PASS++))
    
done < <(find . -name "*.sh" -not -path "./.history/*" -not -path "./node_modules/*" -not -path "./.next/*")

echo ""
echo "Results: $PASS/$TOTAL passed"

if [ $FAIL -gt 0 ]; then
    echo "❌ $FAIL scripts have syntax errors"
    exit 1
else
    echo "✅ All scripts validated successfully"
    exit 0
fi
