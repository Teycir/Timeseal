#!/bin/bash
# Minimal shell script validator

cd "$(dirname "$0")/../.."

echo "🧪 Shell Script Validation"
echo "=========================="
echo ""

PASS=0
FAIL=0

# Test each script
for script in $(find . -name "*.sh" -not -path "./.history/*" -not -path "./node_modules/*" -not -path "./.next/*" -type f | sort); do
    if bash -n "$script" 2>/dev/null; then
        echo "✓ $script"
        ((PASS++))
        chmod +x "$script" 2>/dev/null || true
    else
        echo "✗ $script - SYNTAX ERROR"
        ((FAIL++))
    fi
done

echo ""
echo "Results: $PASS passed, $FAIL failed"

[ $FAIL -eq 0 ] && echo "✅ Success" && exit 0
echo "❌ Failed" && exit 1
