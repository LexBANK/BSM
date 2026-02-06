# BSM Agents

وصف مختصر للمشروع.

## متطلبات
- Node.js 22 (أو بين 18 و22)
- npm

## تشغيل محلي
1. انسخ المتغيرات السرية إلى ملف env أو استخدم secrets
2. تشغيل:
```bash
npm ci
./scripts/run_agents.sh reports false
```

## CI

• يوجد workflows لـ lint, test, security, agents-run
