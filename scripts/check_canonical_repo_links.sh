#!/usr/bin/env bash
set -euo pipefail

echo "Checking for deprecated repository links (LexBANK/BSU)..."

# Detect old canonical repo links while allowing governance documentation to mention
# the legacy name in policy context.
if rg -n "(github\.com/LexBANK/BSU|git@github\.com:LexBANK/BSU|LexBANK/BSU\.git)" \
  README.md docs dns scripts .github \
  --glob '!docs/repo-governance.md' \
  --glob '!scripts/check_canonical_repo_links.sh' \
  --glob '!.github/workflows/canonical-repo-guard.yml'; then
  echo
  echo "❌ Deprecated repository link detected: LexBANK/BSU"
  echo "Please replace it with LexBANK/BSM."
  exit 1
fi

echo "✅ No deprecated LexBANK/BSU links found."
