#!/usr/bin/env bash
set -euo pipefail

echo "[ORBIT] Scanning for duplicate files..."
TMP_FILE=$(mktemp)
find . -type f ! -path "./.git/*" -print0 | xargs -0 md5sum | sort > "$TMP_FILE"
DUPES=$(awk '{print $1}' "$TMP_FILE" | uniq -d)

if [[ -z "$DUPES" ]]; then
  echo "[ORBIT] No duplicate files found."
  exit 0
fi

echo "[ORBIT] Duplicate file hashes found:"
echo "$DUPES"
# NOTE: Report-only mode for safety. Deletion requires manual review.
