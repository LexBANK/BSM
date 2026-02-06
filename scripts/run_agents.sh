#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR="${1:-reports}"
STRICT_MODE="${2:-false}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${REPORT_DIR}/run_${TIMESTAMP}.log"
RESULT_FILE="${REPORT_DIR}/result_${TIMESTAMP}.json"

mkdir -p "$REPORT_DIR"

exec > >(tee -a "$LOG_FILE") 2>&1

AGENT_EXIT=0

echo "=== BSM Agents Run Started ==="
echo "Timestamp : $TIMESTAMP"
echo "Strict    : $STRICT_MODE"
echo "ReportDir : $REPORT_DIR"
echo "--------------------------------"

REQUIRED_VARS=(KM_ENDPOINT KM_TOKEN)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Missing env var: $var"
    exit 10
  fi
done

echo "▶ Running Agents..."
if [[ -f "agents/run.js" ]]; then
  node agents/run.js \
    --endpoint "$KM_ENDPOINT" \
    --out "$RESULT_FILE" || AGENT_EXIT=$?
else
  echo "⚠️ agents/run.js was not found; writing placeholder result"
  AGENT_EXIT=20
  cat > "$RESULT_FILE" <<JSON
{
  "status": "not_executed",
  "reason": "agents/run.js not found",
  "timestamp": "$TIMESTAMP"
}
JSON
fi

if command -v snyk >/dev/null 2>&1; then
  echo "▶ Running Snyk scan..."
  snyk test || echo "⚠️ Snyk findings detected"
else
  echo "⚠️ Snyk is not installed; skipping scan"
fi

echo "--------------------------------"
echo "Agent exit code: $AGENT_EXIT"

if [[ "$STRICT_MODE" == "true" && "$AGENT_EXIT" -ne 0 ]]; then
  echo "❌ Strict mode enabled – failing pipeline"
  exit "$AGENT_EXIT"
fi

echo "✅ Run completed successfully"
exit 0
