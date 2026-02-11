#!/bin/bash
# Manual Testing Script for Core BSM API Endpoints
# Usage: ADMIN_TOKEN=change-me ./scripts/test-endpoints.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-change-me}"

echo "=========================================="
echo "BSM API Endpoints Testing"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

test_endpoint() {
  local name="$1"
  local method="$2"
  local path="$3"
  local extra_header="$4"
  local data="$5"
  local expected_status="$6"
  
  echo -n "Testing $name... "
  
  local headers=()
  if [ -n "$extra_header" ]; then
    headers=(-H "$extra_header")
  fi
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "${headers[@]}" "$BASE_URL$path")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" -H "Content-Type: application/json" -d "$data" "$BASE_URL$path")
  fi
  
  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
  else
    echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status)"
    echo "Response: $body"
    exit 1
  fi
}

echo "=== Phase 1: Core Endpoints ==="
echo ""

test_endpoint "GET /api/health" \
  "GET" "/api/health" "" "" "200"

# /ready returns 503 when not ready (no API key configured in test env)
# This is correct behavior - it should return 200 when ready, 503 when not
test_endpoint "GET /api/ready (not ready state)" \
  "GET" "/api/ready" "" "" "503"

test_endpoint "GET /docs (redirect)" \
  "GET" "/docs/test" "" "" "302"

test_endpoint "POST /api/control/run (no auth)" \
  "POST" "/api/control/run" "" '{"event":"test","payload":{}}' "401"

test_endpoint "POST /api/control/run (with auth)" \
  "POST" "/api/control/run" "x-admin-token: $ADMIN_TOKEN" '{"event":"test","payload":{"test":"data"}}' "200"

echo ""
echo "=== Phase 2: Integration Endpoints ==="
echo ""

test_endpoint "POST /webhook/telegram (help command)" \
  "POST" "/api/webhooks/telegram" "" '{"message":{"chat":{"id":123},"text":"/help","from":{"username":"test"}}}' "200"

test_endpoint "POST /api/research (no query)" \
  "POST" "/api/research" "" '{}' "400"

test_endpoint "POST /api/research (valid query)" \
  "POST" "/api/research" "" '{"query":"What is BSM?"}' "200"

echo ""
echo "=== Phase 3: Admin Endpoints ==="
echo ""

test_endpoint "GET /api/admin/stats (no auth)" \
  "GET" "/api/admin/stats" "" "" "401"

test_endpoint "GET /api/admin/stats (with auth)" \
  "GET" "/api/admin/stats" "x-admin-token: $ADMIN_TOKEN" "" "200"

echo ""
echo "=========================================="
echo -e "${GREEN}All tests passed!${NC}"
echo "=========================================="
