#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR="${1:-reports}"
STRICT_MODE="${2:-false}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${REPORT_DIR}/run_${TIMESTAMP}.log"

mkdir -p "$REPORT_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== BSM Agents Run Started ==="
echo "Timestamp : $TIMESTAMP"
echo "Strict    : $STRICT_MODE"
echo "ReportDir : $REPORT_DIR"
echo "--------------------------------"

# تحقق من المتغيرات الحرجة
REQUIRED_VARS=(KM_ENDPOINT KM_TOKEN)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Missing env var: $var"
    exit 10
  fi
done

# تشغيل الـ agents (عدّل هذا السطر حسب مشروعك)
echo "▶ Running Agents..."
AGENT_EXIT=0
node agents/run.js \
  --endpoint "$KM_ENDPOINT" \
  --out "${REPORT_DIR}/result_${TIMESTAMP}.json" || AGENT_EXIT=$?

echo "Agent exit code: $AGENT_EXIT"

# فحص أمني (اختياري)
if command -v snyk >/dev/null 2>&1; then
  echo "▶ Running Snyk scan..."
  snyk test || echo "⚠️ Snyk findings detected"
fi

echo "--------------------------------"

if [[ "$STRICT_MODE" == "true" && "$AGENT_EXIT" -ne 0 ]]; then
  echo "❌ Strict mode enabled – failing pipeline"
  exit "$AGENT_EXIT"
fi

echo "✅ Run completed successfully"
exit 0
