#!/usr/bin/env bash
set -euo pipefail

echo "[ORBIT] Scanning for duplicate files..."

TMP_FILE=$(mktemp)
trap 'rm -f "$TMP_FILE"' EXIT

find . -type f ! -path "./.git/*" -print0 | xargs -0 md5sum | sort > "$TMP_FILE"

DUPES=$(awk '{print $1}' "$TMP_FILE" | uniq -d)

if [[ -z "$DUPES" ]]; then
  echo "[ORBIT] No duplicate files found."
  exit 0
fi

echo "[ORBIT] Duplicate file hashes found:"
echo "$DUPES"

# Future enhancement:
# - Keep one canonical copy.
# - Delete or archive duplicates.
# - Or emit only a report depending on policy.
# For safety, this script currently reports only.
