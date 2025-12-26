#!/bin/bash
# Simple shell script validator
set -e

cd "$(dirname "$0")/../.."

OUTPUT_FILE="test-results-shell-scripts.txt"
exec > >(tee "$OUTPUT_FILE") 2>&1

echo "Shell Script Validation Report"
echo "Generated: $(date)"
echo "================================"
echo ""

TOTAL=0
PASS=0
FAIL=0

# Find and test all scripts
while IFS= read -r script; do
    ((TOTAL++))
    
    printf "%-60s " "$script"
    
    # Syntax check
    if bash -n "$script" 2>/dev/null; then
        echo "✓ PASS"
        ((PASS++))
        
        # Fix permissions if needed
        if [ ! -x "$script" ]; then
            chmod +x "$script" 2>/dev/null || true
        fi
    else
        echo "✗ FAIL (syntax error)"
        ((FAIL++))
        bash -n "$script" 2>&1 | head -3
    fi
    
done < <(find . -name "*.sh" \
    -not -path "./.history/*" \
    -not -path "./node_modules/*" \
    -not -path "./.next/*" \
    -type f | sort)

echo ""
echo "================================"
echo "Summary:"
echo "  Total:  $TOTAL"
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ All scripts validated successfully!"
    echo ""
    echo "Full report saved to: $OUTPUT_FILE"
    exit 0
else
    echo "❌ $FAIL scripts have errors"
    echo ""
    echo "Full report saved to: $OUTPUT_FILE"
    exit 1
fi
