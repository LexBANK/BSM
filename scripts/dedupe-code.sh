#!/bin/bash
# dedupe-code.sh
# Detects and reports duplicate code blocks in the repository
# Part of ORBIT Self-Healing Agent - Code quality maintenance

set -e

echo "================================================"
echo "ORBIT Code Deduplication Analyzer"
echo "================================================"
echo ""

# Configuration
EXCLUDE_DIRS=".git node_modules dist build coverage .next .cache vendor"
MIN_LINES=${MIN_LINES:-5}  # Minimum lines for duplicate detection
FILE_EXTENSIONS=${FILE_EXTENSIONS:-"js ts jsx tsx py go java c cpp h hpp"}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository root"
    exit 1
fi

echo "Analyzing code for duplicates..."
echo "Excluding directories: $EXCLUDE_DIRS"
echo "Minimum duplicate lines: $MIN_LINES"
echo "File extensions: $FILE_EXTENSIONS"
echo ""

# Build exclude arguments for find
EXCLUDE_ARGS=""
for dir in $EXCLUDE_DIRS; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS -path ./$dir -prune -o"
done

# Build file extension filter
EXT_FILTER=""
for ext in $FILE_EXTENSIONS; do
    if [ -z "$EXT_FILTER" ]; then
        EXT_FILTER="-name *.$ext"
    else
        EXT_FILTER="$EXT_FILTER -o -name *.$ext"
    fi
done

# Count total files to analyze
TOTAL_FILES=$(find . $EXCLUDE_ARGS \( $EXT_FILTER \) -type f -print | wc -l)
echo "Found $TOTAL_FILES files to analyze"
echo ""

# Check if jscpd is available (JavaScript Copy/Paste Detector)
if command -v jscpd &> /dev/null; then
    echo "Using jscpd for code duplication detection..."
    jscpd . --min-lines $MIN_LINES --ignore "$EXCLUDE_DIRS" \
        --format "markdown" --output "./reports/code-duplication.md" || true
    
    if [ -f "./reports/code-duplication.md" ]; then
        echo ""
        echo "Duplication report generated: ./reports/code-duplication.md"
    fi
else
    echo "Note: jscpd not installed. Install with: npm install -g jscpd"
    echo "Performing basic duplicate detection..."
    echo ""
fi

# Simple duplicate detection using grep and sort
echo "Performing basic code pattern analysis..."

TEMP_DIR=$(mktemp -d)
REPORT_FILE="$TEMP_DIR/duplicates.txt"

# Find common code patterns (functions, classes, large blocks)
echo "Scanning for repeated code patterns..."

PATTERNS_FOUND=0

# Look for repeated function signatures
find . $EXCLUDE_ARGS \( $EXT_FILTER \) -type f -print0 | while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        # Extract function/method definitions (simplified pattern)
        grep -E "^[[:space:]]*(function|def|func|class|interface)" "$file" 2>/dev/null | \
            sort | uniq -d | while read -r pattern; do
            if [ -n "$pattern" ]; then
                echo "Potential duplicate pattern in $file:"
                echo "  $pattern"
                PATTERNS_FOUND=$((PATTERNS_FOUND + 1))
            fi
        done
    fi
done > "$REPORT_FILE"

# Generate summary
echo ""
echo "================================================"
echo "Code Duplication Analysis Summary"
echo "================================================"
echo "Files analyzed: $TOTAL_FILES"
echo "Patterns detected: $PATTERNS_FOUND"

if [ -s "$REPORT_FILE" ]; then
    echo ""
    echo "Duplicate patterns found:"
    cat "$REPORT_FILE" | head -20
    
    TOTAL_PATTERNS=$(wc -l < "$REPORT_FILE")
    if [ "$TOTAL_PATTERNS" -gt 20 ]; then
        echo ""
        echo "... and $((TOTAL_PATTERNS - 20)) more patterns"
    fi
    
    # Save full report
    mkdir -p reports
    cp "$REPORT_FILE" reports/code-duplication-basic.txt
    echo ""
    echo "Full report saved to: reports/code-duplication-basic.txt"
else
    echo "No significant code duplication detected!"
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "================================================"
echo "Recommendations"
echo "================================================"
echo "1. Review duplicate patterns and extract to shared utilities"
echo "2. Consider refactoring common code into reusable functions"
echo "3. Use design patterns to reduce code duplication"
echo "4. Install jscpd for more detailed analysis: npm install -g jscpd"
echo ""

echo "Analysis complete!"
