---
name: BSU-SmartAgent
description: "الوكيل الذكي الرئيسي لإدارة المهام والتحسينات"
version: 2.0.0
author: BSM
license: MIT
triggers:
  - event: pull_request
    conditions:
      - base_branch: main
      - base_branch: develop
  - event: push
    conditions:
      - files_changed: ["src/**", "*.py"]
actions:
  - name: validate_structure
    run: python scripts/validate_agent.py
  - name: optimize_code
    run: python scripts/optimize_agent.py
permissions:
  contents: read
  pull-requests: read
---

# BSU Smart Agent

Purpose: التحقق من سلامة ملفات الوكلاء والبنية قبل الدمج مع أقل صلاحيات ممكنة.

## Runtime
- Python 3.11
- Dependencies المستخدمة في المشروع: `pyyaml`, `pydantic`

## Security
- صلاحيات قراءة فقط على المستودع.
- لا يستدعي وكلاء آخرين مباشرة.
- التشغيل عبر CI context فقط.
