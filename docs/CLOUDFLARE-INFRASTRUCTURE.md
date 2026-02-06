# 📘 دليل البنية التحتية لـ Cloudflare - منصة BSM

## نظرة عامة

دليل شامل لإعداد ونشر البنية التحتية لـ Cloudflare Workers و Pages لمنصة BSM.

## 🏗️ المكونات

### 1. LexChat Worker
- **الموقع**: `workers/lexchat/`
- **الوظيفة**: معالجة الصور بالذكاء الاصطناعي
- **Endpoint الإنتاج**: `https://lexchat.moteb.uk`
- **التقنيات**:
  - Cloudflare Workers (TypeScript)
  - Cloudflare AI (Vision Models)
  - R2 Storage (تخزين الصور)

### 2. Cloudflare Pages
- **الموقع**: `app/`
- **الوظيفة**: واجهة المستخدم الأمامية
- **الدومين**: `https://lexdo.uk`
- **التقنيات**:
  - Static Site Hosting
  - Global CDN
  - Automatic HTTPS

### 3. نظام النشر الآلي
- **GitHub Actions**: `.github/workflows/deploy-cloudflare.yml`
- **Scripts**: `scripts/deploy-*.sh`
- **التحديث التلقائي**: `scripts/auto-update-docs.sh`

## 📋 البنية الهرمية للمشروع

```
BSM/
├── workers/
│   └── lexchat/
│       ├── workflows/
│       │   └── image-processing.ts    # Worker الرئيسي
│       ├── wrangler.toml              # إعدادات Cloudflare
│       ├── tsconfig.json              # TypeScript config
│       ├── package.json               # Dependencies
│       ├── .env.example               # متغيرات البيئة (مثال)
│       ├── .gitignore                 # ملفات Git المستثناة
│       └── README.md                  # وثائق Worker
│
├── app/                               # Cloudflare Pages
│   ├── index.html                     # الصفحة الرئيسية
│   ├── styles.css                     # التنسيقات
│   └── app.js                         # JavaScript الواجهة
│
├── scripts/
│   ├── deploy-worker.sh               # نشر Worker
│   ├── deploy-pages.sh                # نشر Pages
│   └── auto-update-docs.sh            # تحديث الوثائق
│
├── .github/workflows/
│   └── deploy-cloudflare.yml          # CI/CD للنشر
│
└── docs/
    ├── reports/                       # التقارير المُولدة
    │   └── deployment-*.md
    └── CLOUDFLARE-INFRASTRUCTURE.md   # هذا الملف
```

## 🚀 دليل الإعداد السريع

### المتطلبات الأساسية

1. **Node.js** >= 18
2. **npm** >= 9
3. **حساب Cloudflare** (مجاني أو مدفوع)
4. **Git** و **GitHub**

### الخطوة 1: تثبيت Wrangler CLI

```bash
npm install -g wrangler
```

### الخطوة 2: تسجيل الدخول إلى Cloudflare

```bash
wrangler login
```

سيفتح متصفحك للمصادقة.

### الخطوة 3: إعداد البنية التحتية (مرة واحدة)

```bash
# من المجلد الرئيسي للمشروع
npm run deploy:setup
```

هذا الأمر سيقوم بـ:
- ✅ إنشاء R2 Buckets
- ✅ طلب إدخال الأسرار (API Keys)
- ✅ إنشاء Pages project

### الخطوة 4: تعيين الأسرار

```bash
npm run worker:secrets
```

سيُطلب منك إدخال:
- `OPENAI_API_KEY` (اختياري)
- `ADMIN_TOKEN` (للعمليات الإدارية)

⚠️ **هام**: الأسرار مشفرة ومخزنة بأمان بواسطة Cloudflare

### الخطوة 5: النشر

```bash
# نشر Worker و Pages معاً
npm run deploy:worker
npm run deploy:pages
```

## 🔐 الأمان

### ✅ ممارسات الأمان المطبقة

#### 1. إدارة الأسرار

```bash
# ✅ الطريقة الصحيحة: استخدام wrangler secret
npx wrangler secret put OPENAI_API_KEY --env production

# ❌ خطأ: لا تضع الأسرار في الكود
const API_KEY = "sk-xxxxx";  // خطأ!
```

#### 2. CORS المحدود

```toml
# workers/lexchat/wrangler.toml
[vars]
ALLOWED_ORIGINS = "https://lexdo.uk,https://www.lexdo.uk"
```

#### 3. فصل البيئات

```bash
# Production
npm run deploy:worker          # lexchat.moteb.uk

# Staging
npm run deploy:worker:staging  # lexchat-staging

# Development
npm run deploy:worker:dev      # lexchat-dev
```

#### 4. حماية من التعرض للأسرار

السكربتات تفحص تلقائياً:
```bash
./scripts/deploy-pages.sh check
```

### 🚫 ما يجب تجنبه

- ❌ لا تضع مفاتيح API في الكود
- ❌ لا تضع أسرار في `.env` ثم ترفعها لـ Git
- ❌ لا تعرض أي مفاتيح للواجهة الأمامية
- ❌ لا تضع أسرار في `wrangler.toml`

### ✅ الطريقة الصحيحة

1. استخدم `wrangler secret put` دائماً
2. استخدم متغيرات بيئة GitHub Secrets للـ CI/CD
3. راجع الكود قبل النشر
4. استخدم CORS محدود

## 🔧 إعدادات Cloudflare Dashboard

### 1. إعداد Worker Route

1. اذهب إلى: https://dash.cloudflare.com
2. اختر Domain: `moteb.uk`
3. Workers Routes → Add Route
4. Route: `lexchat.moteb.uk/*`
5. Worker: `lexchat`
6. Save

### 2. إعداد Custom Domain للـ Pages

1. اذهب إلى: Workers & Pages → lexdo
2. Custom domains → Set up a domain
3. أدخل: `lexdo.uk`
4. Cloudflare سيضيف DNS records تلقائياً
5. أضف أيضاً: `www.lexdo.uk`

### 3. إعداد R2 Buckets

تم إنشاؤها تلقائياً عبر:
```bash
npm run deploy:setup
```

Buckets:
- `lexchat-images` (إنتاج)
- `lexchat-images-staging` (اختبار)
- `lexchat-images-dev` (تطوير)

## 📊 المراقبة والصيانة

### عرض Logs مباشرة

```bash
npm run worker:logs
```

### Cloudflare Dashboard Analytics

https://dash.cloudflare.com
- Workers & Pages → lexchat → Analytics
- عرض:
  - Requests per second
  - Success/Error rates
  - CPU time
  - Memory usage

### تحديث التقارير تلقائياً

```bash
npm run update:reports
```

يولد تقارير في `docs/reports/`

## 🔄 CI/CD - النشر التلقائي

### GitHub Actions Workflow

الملف: `.github/workflows/deploy-cloudflare.yml`

**يتم تشغيله عند**:
- Push إلى `main` branch
- تغييرات في `workers/` أو `app/`
- يدوياً عبر workflow_dispatch

**المراحل**:
1. ✅ Security checks
2. 🚀 Deploy Worker
3. 🚀 Deploy Pages
4. 📝 Update documentation
5. 📧 Notification

### إعداد GitHub Secrets

1. اذهب إلى: GitHub Repo → Settings → Secrets
2. أضف:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

**للحصول على API Token**:
1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Edit Cloudflare Workers
3. انسخ Token
4. أضفه إلى GitHub Secrets

## 🧪 الاختبار

### اختبار Worker محلياً

```bash
cd workers/lexchat
npm run dev
```

سيبدأ على: http://localhost:8787

### اختبار API

```bash
# Health check
curl https://lexchat.moteb.uk/health

# معالجة صورة
curl -X POST https://lexchat.moteb.uk/process \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "caption",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

## 📱 الاستخدام من الواجهة الأمامية

### مثال JavaScript

```javascript
// app/app.js
const API_ENDPOINT = 'https://lexchat.moteb.uk';

async function processImage(imageUrl) {
  try {
    const response = await fetch(`${API_ENDPOINT}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'analyze',
        imageUrl: imageUrl,
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Analysis:', result.data);
      return result.data;
    } else {
      console.error('Error:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// ✅ آمن: لا أسرار في الواجهة الأمامية
// ❌ خطأ: لا تضع API keys هنا!
```

## 🔧 استكشاف الأخطاء

### خطأ: "Bucket not found"

```bash
./scripts/deploy-worker.sh buckets
```

### خطأ: "Unauthorized"

```bash
wrangler login
# أو
export CLOUDFLARE_API_TOKEN=your-token
```

### خطأ: "Route already exists"

1. Cloudflare Dashboard → Domain → Workers Routes
2. احذف Route القديم
3. أعد النشر

### خطأ: "Secret not found"

```bash
npm run worker:secrets
```

### فشل النشر في CI/CD

1. تحقق من GitHub Secrets
2. تحقق من صلاحيات API Token
3. راجع GitHub Actions logs

## 📚 الموارد الإضافية

### الوثائق الرسمية

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare AI](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### ملفات وثائق المشروع

- `workers/lexchat/README.md` - وثائق Worker مفصلة
- `scripts/deploy-worker.sh --help` - مساعدة النشر
- `.env.example` - أمثلة المتغيرات البيئية

## 🆘 الدعم

### للحصول على مساعدة:

1. **راجع Logs**:
   ```bash
   npm run worker:logs
   ```

2. **تحقق من Dashboard**:
   https://dash.cloudflare.com

3. **راجع الوثائق**:
   - `workers/lexchat/README.md`
   - هذا الملف

4. **تحقق من GitHub Actions**:
   https://github.com/YOUR_ORG/BSM/actions

## 📝 Checklist للإطلاق الإنتاجي

### قبل الإطلاق

- [ ] تم تثبيت جميع Dependencies
- [ ] تم إنشاء R2 Buckets
- [ ] تم تعيين جميع الأسرار
- [ ] تم اختبار Worker محلياً
- [ ] تم مراجعة CORS settings
- [ ] تم فحص الكود من الأسرار المكشوفة
- [ ] تم إعداد GitHub Secrets للـ CI/CD
- [ ] تم إعداد Custom domains

### بعد الإطلاق

- [ ] اختبار جميع Endpoints
- [ ] التحقق من عمل CORS
- [ ] مراقبة Logs لمدة 24 ساعة
- [ ] اختبار معالجة الصور
- [ ] التحقق من تحديث التقارير
- [ ] إعداد Alerts (اختياري)

## 🎯 الخطوات التالية

1. **إعداد المراقبة المتقدمة**:
   - Cloudflare Logpush
   - Error tracking
   - Performance monitoring

2. **إضافة ميزات جديدة**:
   - معالجة فيديو
   - أنواع ملفات إضافية
   - تحسينات AI

3. **التحسين**:
   - Caching strategies
   - Performance optimization
   - Cost optimization

---

**تم الإنشاء**: 2024  
**النسخة**: 1.0.0  
**المؤلف**: BSM Autonomous Architect  
**الترخيص**: MIT  

*لأي استفسارات أو مشاكل، راجع الوثائق أو تواصل مع فريق التطوير.*
