# LexChat Worker - معالجة الصور بالذكاء الاصطناعي

## نظرة عامة

Worker معالجة الصور باستخدام Cloudflare AI و R2 Storage لمنصة LexChat.

## المميزات

- ✅ معالجة الصور بالذكاء الاصطناعي
- ✅ تحليل الصور (Image Analysis)
- ✅ توليد عناوين تلقائية (Caption Generation)
- ✅ استخراج النص (OCR)
- ✅ تخزين آمن في R2
- ✅ حماية CORS
- ✅ إدارة آمنة للأسرار

## البنية التحتية

```
workers/lexchat/
├── workflows/
│   └── image-processing.ts    # Worker الرئيسي
├── wrangler.toml               # إعدادات Cloudflare
├── tsconfig.json               # إعدادات TypeScript
├── package.json                # Dependencies
└── README.md                   # هذا الملف
```

## الإعداد الأولي

### 1. تثبيت Dependencies

```bash
cd workers/lexchat
npm install
```

### 2. تسجيل الدخول إلى Cloudflare

```bash
npx wrangler login
```

### 3. إنشاء R2 Buckets

```bash
# من المجلد الرئيسي للمشروع
npm run deploy:setup
# أو
./scripts/deploy-worker.sh buckets
```

### 4. إعداد الأسرار

⚠️ **هام**: جميع الأسرار يجب أن تُعيّن عبر `wrangler secret` ولا تُضمن في الكود أبداً

```bash
# من المجلد الرئيسي
npm run worker:secrets
# أو
./scripts/deploy-worker.sh secrets
```

سيُطلب منك إدخال:
- `OPENAI_API_KEY` - مفتاح OpenAI API (اختياري)
- `ADMIN_TOKEN` - توكن المسؤول للعمليات الإدارية

## النشر

### نشر الإنتاج

```bash
# من المجلد الرئيسي
npm run deploy:worker

# أو من مجلد worker
cd workers/lexchat
npm run deploy
```

سيتم النشر إلى:
- **URL**: `https://lexchat.moteb.uk`
- **Worker Dev**: `https://lexchat.<yourname>.workers.dev`

### نشر Staging

```bash
npm run deploy:worker:staging
```

### نشر Development

```bash
npm run deploy:worker:dev
```

## البيئات

### Production
- **Domain**: `lexchat.moteb.uk`
- **Bucket**: `lexchat-images`
- **CORS**: `https://lexdo.uk`, `https://www.lexdo.uk`

### Staging
- **Worker**: `lexchat-staging`
- **Bucket**: `lexchat-images-staging`

### Development
- **Worker**: `lexchat-dev`
- **Bucket**: `lexchat-images-dev`
- **CORS**: `*` (جميع المصادر)

## API Endpoints

### Health Check
```bash
GET /health
GET /
```

**Response:**
```json
{
  "status": "healthy",
  "service": "lexchat-image-processing",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### معالجة الصور
```bash
POST /process
Content-Type: application/json

{
  "operation": "analyze|caption|ocr|resize",
  "imageUrl": "https://example.com/image.jpg",
  // أو
  "imageData": "data:image/jpeg;base64,...",
  "options": {
    "width": 800,
    "height": 600,
    "quality": 85,
    "format": "jpeg"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "processingTime": 1250,
  "metadata": {
    "size": 102400,
    "format": "image/jpeg"
  }
}
```

### رفع الصور
```bash
POST /store
Content-Type: multipart/form-data

FormData:
  file: [Image File]
```

**Response:**
```json
{
  "success": true,
  "key": "images/1234567890-image.jpg",
  "url": "https://lexchat.moteb.uk/retrieve/images/1234567890-image.jpg"
}
```

### استرجاع الصور
```bash
GET /retrieve/{key}
```

**Response:** Image binary data

## الأمان

### ✅ ممارسات الأمان المتبعة

1. **عدم تضمين الأسرار في الكود**
   - جميع المفاتيح في `wrangler secret`
   - لا توجد أسرار في المتغيرات البيئية العامة

2. **CORS محدود**
   - مصادر محددة فقط في الإنتاج
   - حماية من Cross-Origin attacks

3. **التحقق من الطلبات**
   - Content-Type validation
   - Optional token authentication
   - Input sanitization

4. **تشفير في النقل**
   - HTTPS فقط
   - TLS 1.3

5. **Rate Limiting**
   - حماية على مستوى Worker
   - حماية Cloudflare الافتراضية

### ⚠️ إرشادات الأمان

- ❌ لا تضع أي مفاتيح API في الكود
- ❌ لا تعرض أسرار للواجهة الأمامية
- ❌ لا تضع أي معلومات حساسة في wrangler.toml
- ✅ استخدم `wrangler secret` فقط
- ✅ راجع CORS origins بانتظام
- ✅ فعّل Observability للمراقبة

## المراقبة

### عرض اللوقات

```bash
# من المجلد الرئيسي
npm run worker:logs

# أو
./scripts/deploy-worker.sh logs
```

### Cloudflare Dashboard

عرض الإحصائيات والمقاييس:
- https://dash.cloudflare.com
- Workers & Pages → lexchat
- Analytics & Logs

## التطوير المحلي

```bash
cd workers/lexchat
npm run dev
```

سيبدأ خادم التطوير على:
- http://localhost:8787

## استكشاف الأخطاء

### خطأ "Bucket not found"

```bash
./scripts/deploy-worker.sh buckets
```

### خطأ "Unauthorized"

```bash
npx wrangler login
# أو
export CLOUDFLARE_API_TOKEN=your-token
```

### خطأ "Secret not found"

```bash
./scripts/deploy-worker.sh secrets
```

## الدعم الفني

للمساعدة:
1. تحقق من اللوقات: `npm run worker:logs`
2. راجع Cloudflare Dashboard
3. تأكد من إعداد الأسرار صحيحة
4. تحقق من DNS settings للدومين

## الترخيص

MIT License - BSM Platform

---

**تم إنشاؤه بواسطة**: BSM Autonomous Architect  
**التاريخ**: 2024  
**النسخة**: 1.0.0
