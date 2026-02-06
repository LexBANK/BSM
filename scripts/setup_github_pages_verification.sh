#!/usr/bin/env bash

# GitHub Pages Domain Verification for lexdo.uk
# This script adds the required TXT record to Cloudflare DNS and verifies propagation.
#
# Usage:
#   bash scripts/setup_github_pages_verification.sh YOUR_CLOUDFLARE_API_TOKEN

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────
ZONE_ID="1c32bc5010d8b0c4a501e8458fd2cc14"
RECORD_NAME="_github-pages-challenge-MOTEB1989.lexdo.uk"
RECORD_CONTENT="2807347ff93e933b27e52bb29e794c"
API_BASE="https://api.cloudflare.com/client/v4"
# ─────────────────────────────────────────────────────────────────

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  GitHub Pages Domain Verification — lexdo.uk${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Step 0: Get API Token ───────────────────────────────────────
if [ -z "${1:-}" ]; then
  echo -e "${RED}✗ Error: API Token is required.${NC}"
  echo ""
  echo "  How to get your token (takes 1 minute):"
  echo "  1. Go to: https://dash.cloudflare.com/profile/api-tokens"
  echo "  2. Click 'Create Token'"
  echo "  3. Select 'Edit zone DNS' template"
  echo "  4. Under 'Zone Resources', select 'All zones' or 'lexdo.uk'"
  echo "  5. Click 'Continue to summary' → 'Create Token'"
  echo "  6. Copy the token and run:"
  echo ""
  echo -e "     ${GREEN}bash scripts/setup_github_pages_verification.sh YOUR_TOKEN_HERE${NC}"
  echo ""
  exit 1
fi

API_TOKEN="$1"

# ─── Step 1: Verify API Token ───────────────────────────────────
echo -e "${YELLOW}[1/4] Verifying API token…${NC}"
VERIFY=$(curl -s -w "\n%{http_code}" \
  "${API_BASE}/user/tokens/verify" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$VERIFY" | tail -1)
BODY=$(echo "$VERIFY" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}✗ Invalid API token. HTTP ${HTTP_CODE}${NC}"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi
echo -e "${GREEN}✓ API token is valid.${NC}"

# ─── Step 2: Check for existing record ──────────────────────────
echo -e "${YELLOW}[2/4] Checking for existing TXT record…${NC}"
EXISTING=$(curl -s \
  "${API_BASE}/zones/${ZONE_ID}/dns_records?type=TXT&name=${RECORD_NAME}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json")

EXISTING_COUNT=$(echo "$EXISTING" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result_info',{}).get('count',0))" 2>/dev/null || echo "0")

if [ "$EXISTING_COUNT" -gt "0" ]; then
  EXISTING_ID=$(echo "$EXISTING" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['id'])" 2>/dev/null)
  EXISTING_CONTENT=$(echo "$EXISTING" | python3 -c "import sys,json; print(json.load(sys.stdin)['result'][0]['content'])" 2>/dev/null)

  if [ "$EXISTING_CONTENT" = "$RECORD_CONTENT" ]; then
    echo -e "${GREEN}✓ TXT record already exists with correct value. Skipping creation.${NC}"
  else
    echo -e "${YELLOW}⚠ TXT record exists but with different value. Updating...${NC}"
    UPDATE=$(curl -s \
      "${API_BASE}/zones/${ZONE_ID}/dns_records/${EXISTING_ID}" \
      --request PUT \
      -H "Authorization: Bearer ${API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"TXT\",\"name\":\"${RECORD_NAME}\",\"content\":\"${RECORD_CONTENT}\",\"ttl\":1}")

    SUCCESS=$(echo "$UPDATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
      echo -e "${GREEN}✓ TXT record updated successfully.${NC}"
    else
      echo -e "${RED}✗ Failed to update TXT record:${NC}"
      echo "$UPDATE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE"
      exit 1
    fi
  fi
else
  # ─── Step 3: Create TXT record ──────────────────────────────
  echo -e "${YELLOW}[3/4] Creating TXT record…${NC}"
  echo "       Name:    ${RECORD_NAME}"
  echo "       Content: ${RECORD_CONTENT}"
  echo ""

  CREATE=$(curl -s \
    "${API_BASE}/zones/${ZONE_ID}/dns_records" \
    --request POST \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"TXT\",\"name\":\"${RECORD_NAME}\",\"content\":\"${RECORD_CONTENT}\",\"ttl\":1,\"proxied\":false}")

  SUCCESS=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
  if [ "$SUCCESS" = "True" ]; then
    RECORD_ID=$(echo "$CREATE" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])" 2>/dev/null)
    echo -e "${GREEN}✓ TXT record created successfully!${NC}"
    echo -e "  Record ID: ${RECORD_ID}"
  else
    echo -e "${RED}✗ Failed to create TXT record:${NC}"
    echo "$CREATE" | python3 -m json.tool 2>/dev/null || echo "$CREATE"
    exit 1
  fi
fi

# ─── Step 4: Verify DNS propagation ─────────────────────────────
echo ""
echo -e "${YELLOW}[4/4] Verifying DNS propagation…${NC}"
echo "       (Cloudflare usually propagates within 1-2 minutes)"
echo ""

MAX_RETRIES=6
RETRY_INTERVAL=10

for i in $(seq 1 "$MAX_RETRIES"); do
  RESULT=$(curl -s "https://dns.google/resolve?name=${RECORD_NAME}&type=TXT" 2>/dev/null)
  ANSWER=$(echo "$RESULT" | python3 -c "import sys,json; data=json.load(sys.stdin); print('FOUND' if any('${RECORD_CONTENT}' in a.get('data','') for a in data.get('Answer', [])) else 'NOT_FOUND')" 2>/dev/null || echo "NOT_FOUND")

  if [ "$ANSWER" = "FOUND" ]; then
    echo -e "${GREEN}✓ DNS propagation confirmed! Record is live globally.${NC}"
    echo ""
    echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ ALL DONE! Now go to GitHub and click 'Verify':${NC}"
    echo -e "${CYAN}  https://github.com/settings/pages_verified_domains/lexdo.uk${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
  fi

  echo "  Attempt ${i}/${MAX_RETRIES}: Not propagated yet. Waiting ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

echo ""
echo -e "${YELLOW}⚠ Record was created but DNS hasn’t fully propagated yet.${NC}"
echo "  This is normal — try clicking 'Verify' on GitHub in a few minutes:"
echo "  https://github.com/settings/pages_verified_domains/lexdo.uk"
echo ""
echo "  You can also check manually:"
echo "  https://dns.google/resolve?name=${RECORD_NAME}&type=TXT"
echo ""
