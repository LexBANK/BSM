#!/bin/bash
# dedupe-files.sh
# Removes duplicate files in the repository based on content hash
# Part of ORBIT Self-Healing Agent - File system maintenance

set -e

echo "================================================"
echo "ORBIT File Deduplication Script"
echo "================================================"
echo ""

# Configuration
DRY_RUN=${DRY_RUN:-false}
EXCLUDE_DIRS=".git node_modules dist build coverage .next .cache"
MIN_SIZE=${MIN_SIZE:-1024}  # Minimum file size in bytes (default: 1KB)

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository root"
    exit 1
fi

echo "Scanning for duplicate files..."
echo "Excluding directories: $EXCLUDE_DIRS"
echo "Minimum file size: $MIN_SIZE bytes"
echo ""

# Build exclude arguments for find
EXCLUDE_ARGS=""
for dir in $EXCLUDE_DIRS; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS -path ./$dir -prune -o"
done

# Find all files and compute their MD5 hashes
echo "Computing file hashes..."
TEMP_FILE=$(mktemp)
find . $EXCLUDE_ARGS -type f -size +${MIN_SIZE}c -print0 | while IFS= read -r -d '' file; do
    if [ -f "$file" ]; then
        hash=$(md5sum "$file" 2>/dev/null | cut -d' ' -f1)
        echo "$hash $file" >> "$TEMP_FILE"
    fi
done

# Find duplicates
echo ""
echo "Analyzing for duplicates..."
DUPLICATES=$(sort "$TEMP_FILE" | awk '{print $1}' | uniq -d)

if [ -z "$DUPLICATES" ]; then
    echo "No duplicate files found!"
    rm "$TEMP_FILE"
    exit 0
fi

TOTAL_DUPLICATES=0
TOTAL_SAVED=0

for hash in $DUPLICATES; do
    echo ""
    echo "Duplicate set (hash: $hash):"
    FILES=$(grep "^$hash " "$TEMP_FILE" | cut -d' ' -f2-)
    
    # Keep the first file, mark others as duplicates
    FIRST_FILE=""
    for file in $FILES; do
        if [ -z "$FIRST_FILE" ]; then
            FIRST_FILE="$file"
            echo "  [KEEP] $file"
        else
            SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
            echo "  [DUP]  $file (size: $SIZE bytes)"
            TOTAL_DUPLICATES=$((TOTAL_DUPLICATES + 1))
            TOTAL_SAVED=$((TOTAL_SAVED + SIZE))
            
            if [ "$DRY_RUN" = "false" ]; then
                rm "$file"
                echo "         Removed!"
            fi
        fi
    done
done

# Cleanup
rm "$TEMP_FILE"

echo ""
echo "================================================"
echo "Deduplication Summary"
echo "================================================"
echo "Total duplicate files: $TOTAL_DUPLICATES"
echo "Space that can be saved: $(numfmt --to=iec $TOTAL_SAVED 2>/dev/null || echo $TOTAL_SAVED bytes)"

if [ "$DRY_RUN" = "true" ]; then
    echo ""
    echo "DRY RUN MODE - No files were deleted"
    echo "Run with DRY_RUN=false to actually remove duplicates"
fi

echo ""
echo "Deduplication complete!"
