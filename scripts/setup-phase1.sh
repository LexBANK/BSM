#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setting up Phase 1: Infrastructure"

# إنشاء المجلدات المفقودة
mkdir -p logs/audit
mkdir -p data/agents
mkdir -p data/knowledge
mkdir -p tests

# نسخ الإعدادات
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "⚠️  Please edit .env with safe placeholders and load real secrets from a Key Management Layer"
fi

# التحقق من التبعيات
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node 22+"
  exit 1
fi

# تثبيت dependencies
npm ci

# تشغيل التحقق الأولي
ADMIN_TOKEN="${ADMIN_TOKEN:-test-admin-token-1234}" OPENAI_BSM_KEY="${OPENAI_BSM_KEY:-sk-placeholder}" node --input-type=module -e "import('./src/config/index.js').then(({validateConfig}) => validateConfig())"

# تشغيل الاختبارات
npm test
node --test tests/integration.test.js

echo "✅ Phase 1 setup complete!"
echo "Next: Run 'docker compose up --build' to start services"
