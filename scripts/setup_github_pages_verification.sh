#!/usr/bin/env bash
set -euo pipefail

CLOUDFLARE_API="https://api.cloudflare.com/client/v4"
ZONE_ID_DEFAULT="1c32bc5010d8b0c4a501e8458fd2cc14"
RECORD_TYPE="TXT"
RECORD_NAME_DEFAULT="_github-pages-challenge-MOTEB1989.lexdo.uk"
RECORD_CONTENT_DEFAULT="2807347ff93e933b27e52bb29e794c"
RECORD_TTL=1
GITHUB_VERIFY_URL_DEFAULT="https://github.com/LexBANK/BSM/settings/pages"

usage() {
  cat <<USAGE
Usage:
  bash scripts/setup_github_pages_verification.sh <CLOUDFLARE_API_TOKEN> [zone_id] [record_name] [record_content]

Optional environment variables:
  GITHUB_VERIFY_URL   Override the GitHub Pages settings URL printed at the end.
  DNS_POLL_ATTEMPTS   Number of DNS propagation checks (default: 18).
  DNS_POLL_INTERVAL   Seconds between checks (default: 10).
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

TOKEN="${1:-}"
ZONE_ID="${2:-$ZONE_ID_DEFAULT}"
RECORD_NAME="${3:-$RECORD_NAME_DEFAULT}"
RECORD_CONTENT="${4:-$RECORD_CONTENT_DEFAULT}"
GITHUB_VERIFY_URL="${GITHUB_VERIFY_URL:-$GITHUB_VERIFY_URL_DEFAULT}"
DNS_POLL_ATTEMPTS="${DNS_POLL_ATTEMPTS:-18}"
DNS_POLL_INTERVAL="${DNS_POLL_INTERVAL:-10}"

if [[ -z "$TOKEN" ]]; then
  echo "❌ Missing Cloudflare API token."
  usage
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Required command not found: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd python3

api_call() {
  local method="$1"
  local endpoint="$2"
  local data="${3:-}"

  if [[ -n "$data" ]]; then
    curl -sS -X "$method" "$CLOUDFLARE_API$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -sS -X "$method" "$CLOUDFLARE_API$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
  fi
}

parse_json() {
  local key="$1"
  python3 -c "import json,sys; d=json.load(sys.stdin); print($key)"
}

echo "🔐 Verifying Cloudflare API token..."
VERIFY_RESPONSE="$(api_call GET "/user/tokens/verify")"
VERIFY_SUCCESS="$(printf '%s' "$VERIFY_RESPONSE" | parse_json 'str(d.get("success", False)).lower()')"

if [[ "$VERIFY_SUCCESS" != "true" ]]; then
  ERRORS="$(printf '%s' "$VERIFY_RESPONSE" | parse_json '"; ".join(e.get("message", "Unknown error") for e in d.get("errors", []))')"
  echo "❌ Token verification failed: ${ERRORS:-Unknown error}"
  exit 1
fi

echo "✅ Token is valid."

echo "🔎 Checking whether TXT record already exists..."
EXISTING_RESPONSE="$(api_call GET "/zones/$ZONE_ID/dns_records?type=$RECORD_TYPE&name=$RECORD_NAME")"
EXISTING_SUCCESS="$(printf '%s' "$EXISTING_RESPONSE" | parse_json 'str(d.get("success", False)).lower()')"

if [[ "$EXISTING_SUCCESS" != "true" ]]; then
  ERRORS="$(printf '%s' "$EXISTING_RESPONSE" | parse_json '"; ".join(e.get("message", "Unknown error") for e in d.get("errors", []))')"
  echo "❌ Failed fetching DNS records: ${ERRORS:-Unknown error}"
  exit 1
fi

RECORD_ID="$(printf '%s' "$EXISTING_RESPONSE" | parse_json 'd.get("result", [{}])[0].get("id", "") if d.get("result") else ""')"

PAYLOAD="$(python3 - <<PY
import json
print(json.dumps({
  "type": "$RECORD_TYPE",
  "name": "$RECORD_NAME",
  "content": "$RECORD_CONTENT",
  "ttl": $RECORD_TTL,
  "proxied": False,
}))
PY
)"

if [[ -n "$RECORD_ID" ]]; then
  echo "✏️ Existing record found. Updating record..."
  UPSERT_RESPONSE="$(api_call PUT "/zones/$ZONE_ID/dns_records/$RECORD_ID" "$PAYLOAD")"
else
  echo "➕ Creating TXT record..."
  UPSERT_RESPONSE="$(api_call POST "/zones/$ZONE_ID/dns_records" "$PAYLOAD")"
fi

UPSERT_SUCCESS="$(printf '%s' "$UPSERT_RESPONSE" | parse_json 'str(d.get("success", False)).lower()')"
if [[ "$UPSERT_SUCCESS" != "true" ]]; then
  ERRORS="$(printf '%s' "$UPSERT_RESPONSE" | parse_json '"; ".join(e.get("message", "Unknown error") for e in d.get("errors", []))')"
  echo "❌ Failed writing TXT record: ${ERRORS:-Unknown error}"
  exit 1
fi

echo "✅ TXT record is set: $RECORD_NAME"
echo "📡 Checking DNS propagation..."

if command -v dig >/dev/null 2>&1; then
  for ((i=1; i<=DNS_POLL_ATTEMPTS; i++)); do
    DIG_OUTPUT="$(dig +short TXT "$RECORD_NAME" | tr -d '"')"
    if printf '%s\n' "$DIG_OUTPUT" | grep -Fxq "$RECORD_CONTENT"; then
      echo "✅ DNS propagated successfully on attempt $i/$DNS_POLL_ATTEMPTS."
      echo "🔗 Open GitHub and click Verify: $GITHUB_VERIFY_URL"
      exit 0
    fi

    echo "⏳ Attempt $i/$DNS_POLL_ATTEMPTS: record not visible yet. Waiting ${DNS_POLL_INTERVAL}s..."
    sleep "$DNS_POLL_INTERVAL"
  done

  echo "⚠️ Record created but not visible yet in public DNS."
  echo "   It may need more time to propagate. Re-run this script in a few minutes."
  echo "🔗 Once visible, verify in GitHub: $GITHUB_VERIFY_URL"
else
  echo "⚠️ 'dig' command is not installed, so propagation check was skipped."
  echo "🔗 Verify in GitHub after a short wait: $GITHUB_VERIFY_URL"
fi
