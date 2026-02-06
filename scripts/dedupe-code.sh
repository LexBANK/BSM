#!/usr/bin/env bash
set -euo pipefail

echo "[ORBIT] Scanning for duplicate code blocks..."

# Placeholder for deeper duplication checks (e.g. jscpd).
if npx jscpd --version >/dev/null 2>&1; then
  npx jscpd --min-lines 5 --reporters console --threshold 0 src || true
else
  echo "[ORBIT] jscpd not installed. Skipping deep code dedupe."
fi
