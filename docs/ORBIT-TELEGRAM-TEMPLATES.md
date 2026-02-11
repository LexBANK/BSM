# ORBIT Telegram Official Message Templates

## Official Commands

- `/status` — System status report
- `/review repo` — Full repository review
- `/deploy` — Trigger official deployment request
- `/purge` — Purge Cloudflare cache
- `/cleanup` — Cleanup stale branches
- `/dedupe` — Duplicate scan and dedupe recommendations
- `/orbit log` — Show latest ORBIT decisions
- `/help` — Show official command list

## Template Replies

### `/status`

```text
📊 BSM Status

✅ System: Online
🤖 Agents: 6
🔒 Safe Mode: OFF
📱 Mobile Mode: OFF
🏠 LAN Only: OFF
⏱️ Uptime: 3600s
🌍 Environment: production
```

**Note:** This command requires admin privileges. It returns real-time system status including:
- Number of registered agents from registry.yaml
- Current feature flag states (Safe Mode, Mobile Mode, LAN Only)
- System uptime in seconds
- Current environment (development/production)

### `/review repo`

```text
تقرير مراجعة المستودع

Branches: 12 active
Stale Branches (>30d): 3
Duplicate Files: 0
Duplicate Code Blocks: 0
Open PRs: 4
Open Issues: 18
Security Alerts: None

لإجراء تنظيف تلقائي أرسل: /cleanup
```

### `/deploy`

```text
طلب نشر رسمي

تم استلام طلب النشر. العملية قيد التنفيذ. سيتم إعلامكم عند اكتمال النشر أو عند حدوث أي خطأ.
```

### `/purge`

```text
طلب تفريغ الكاش

تم استلام الطلب. تفريغ الكاش جارٍ. ستتلقى إشعاراً عند الانتهاء.
```

### `/cleanup`

```text
طلب تنظيف الفروع

تم استلام الطلب. جارٍ فحص الفروع القديمة. سيُعرض تقرير قبل أي حذف نهائي.
```

### `/dedupe`

```text
طلب فحص وإزالة التكرار

تم استلام الطلب. جارٍ فحص الملفات والأكواد. سيُعرض تقرير بالنتائج والتوصيات.
```

### Unauthorized Command

```text
عذراً. ليس لديك صلاحية تنفيذ هذا الأمر. للتفويض يرجى التواصل مع مدير النظام.
```

### Success Notification

```text
إشعار تنفيذ

الإجراء: {{action}}
النتيجة: تم التنفيذ بنجاح
الوقت: {{timestamp}}
ملاحظات: {{notes}}
```

### Failure Notification

```text
تنبيه فني

الإجراء: {{action}}
النتيجة: فشل أثناء التنفيذ
الوقت: {{timestamp}}
الخطأ: {{error_summary}}
الإجراء المقترح: راجع السجلات أو تواصل مع مهندس DevOps
```
