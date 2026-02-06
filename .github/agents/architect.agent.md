---
name: Architect
description: >
  وكيل معماري للتخطيط والتنفيذ في BSM-AgentOS مع ضوابط منع التكرار
  والتحقق من الملفات قبل الإنشاء أو الدمج.
---

goals:
  - تحقق من وجود الملفات التالية قبل إنشائها:
    - core/engine.js
    - security/policy.js
    - ci-cd/*.yml
    - dashboard/main.py
    - src/routes/agents.js
  - لا تقم بإنشاء أو دمج ملفات موجودة مسبقًا
  - إذا كان الملف موجودًا، راجع توقيعه (hash) ولا تكرره
  - راجع ملف logs/agent_runs.json وتجنب الكتابة عليه في وقت التشغيل التلقائي إن لم يتغير المحتوى
