# iOS Chat Readiness Runbook

هذه الوثيقة تضمن جاهزية تجربة الدردشة على Safari في iOS قبل الإطلاق، وتحدد ما يجب اختباره دورياً وما المؤشرات التي يجب تتبّعها.

## 1) Safari iOS Compatibility Matrix

> **مهم:** القيم أدناه هي خط الأساس المطلوب. أي تراجع (Regression) يُصنف Blocker قبل الإطلاق.

| Area | iOS 16 (Safari) | iOS 17 (Safari) | iOS 18 (Safari) | Notes |
|---|---|---|---|---|
| Chat UI render (layout + typography) | ✅ Required | ✅ Required | ✅ Required | تأكد من عدم كسر Tailwind classes على الشاشات الصغيرة.
| Input focus behavior | ✅ Required | ✅ Required | ✅ Required | لا قفزات بصرية عند فتح/إغلاق الكيبورد.
| Soft keyboard overlap handling | ✅ Required | ✅ Required | ✅ Required | صندوق الإدخال وزر الإرسال يبقيان مرئيين.
| Scroll position restore after new messages/navigation | ✅ Required | ✅ Required | ✅ Required | العودة لنفس موضع القراءة بعد الرجوع للشاشة.
| Safe-area insets (`env(safe-area-inset-*)`) | ✅ Required | ✅ Required | ✅ Required | دعم الأجهزة ذات الـ notch / dynamic island.
| Offline/online transition | ✅ Required | ✅ Required | ✅ Required | إظهار حالة اتصال واضحة + retry منطقي.
| Duplicate submit guard | ✅ Required | ✅ Required | ✅ Required | منع إرسال نفس الرسالة مرتين أثناء pending.
| Request timeout UX | ✅ Required | ✅ Required | ✅ Required | رسالة خطأ مفهومة + خيار إعادة المحاولة.

### Test devices (minimum)
- iPhone (compact width) على iOS 16.
- iPhone حديث على iOS 17.
- iPhone حديث/Simulator على iOS 18 (إن توفر).

## 2) Mandatory UI Test Cases

يجب تنفيذ الحالات التالية في كل release candidate:

1. **Keyboard overlap**
   - افتح شاشة الدردشة.
   - ركّز على input.
   - تحقق أن input + send button غير مخفيين خلف الكيبورد.
2. **Input focus stability**
   - بدّل بين input وأي عنصر تفاعلي آخر.
   - تحقق من عدم حدوث blur/focus loops أو jumps مفاجئة.
3. **Scroll restore**
   - انتقل داخل محادثة طويلة.
   - افتح شاشة أخرى ثم ارجع.
   - تحقق من استعادة موضع scroll الصحيح.
4. **Safe-area compliance**
   - اختبر portrait/landscape.
   - تحقق أن عناصر الـ header/footer لا تتداخل مع safe area.

## 3) Network Test Cases

1. **Offline/Online retry**
   - افصل الشبكة أثناء إرسال رسالة.
   - تحقق من فشل محسوب (رسالة واضحة + retry action).
   - أعد الاتصال وتحقق من نجاح retry.
2. **Timeout handling**
   - حاكِ API بطيئة/متوقفة.
   - تحقق من timeout واضح للمستخدم خلال الزمن المعتمد.
3. **Duplicate submit guard**
   - اضغط send عدة مرات بسرعة أثناء pending request.
   - تحقق من إرسال رسالة واحدة فقط.

## 4) Metrics & SLAs

تُراجع شهرياً (وأسبوعياً عند الحاجة):

- **Error rate**
  - التعريف: `failed_chat_requests / total_chat_requests`.
  - الهدف المبدئي: أقل من **1.5%**.
- **Median response latency (p50)**
  - التعريف: الزمن الوسيط من لحظة الإرسال حتى استلام الرد.
  - الهدف المبدئي: أقل من **1800ms** على اتصال جيد.
- **Reconnect success rate**
  - التعريف: `successful_retries_after_disconnect / retry_attempts`.
  - الهدف المبدئي: أعلى من **95%**.

## 5) Monthly Readiness Report Process

- التقرير الشهري يُنشأ تلقائياً داخل `reports/ios-chat-readiness-<date>.md`.
- مصدر التوليد: `scripts/generate-ios-chat-readiness-report.js`.
- الجدولة: GitHub Actions workflow (`.github/workflows/ios-chat-readiness-monthly.yml`).
- في حال فشل workflow، يمكن توليد التقرير يدوياً:

```bash
node scripts/generate-ios-chat-readiness-report.js
```

أو مع تاريخ محدد:

```bash
node scripts/generate-ios-chat-readiness-report.js --date 2026-02
```
