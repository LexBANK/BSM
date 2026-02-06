#!/usr/bin/env bash
set -euo pipefail

PROTECTED=("main" "develop" "staging")
git fetch --all --prune

echo "[ORBIT] Candidate branches for cleanup:"
for branch in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | sed 's|origin/||'); do
  if [[ " ${PROTECTED[*]} " == *" $branch "* ]]; then
    continue
  fi

  last_commit_date=$(git log -1 --format=%ct "origin/$branch" || echo 0)
  age_days=$((( $(date +%s) - last_commit_date ) / 86400))
  if [ "$age_days" -gt 30 ]; then
    echo "$branch (age: ${age_days}d)"
  fi
done

echo "Review the above list before any destructive delete action."
