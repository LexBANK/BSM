#!/usr/bin/env bash
# Setup script for corehub.nexus migration

set -euo pipefail

echo "🚀 Setting up corehub.nexus..."

# 1. Verify Cloudflare credentials
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "❌ Error: CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" ]]; then
  echo "❌ Error: CLOUDFLARE_ZONE_ID not set"
  exit 1
fi

# 2. Update DNS records
echo "📡 Updating DNS records..."
curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/import" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -F "file=@dns/corehub-nexus-zone.txt"

# 3. Verify domain
echo "🔍 Verifying domain..."
sleep 5
dig +short CNAME corehub.nexus || true

echo "✅ Setup complete! Check https://corehub.nexus"
