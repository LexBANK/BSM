# 🚀 Quick Start - Cloudflare Deployment

دليل سريع لنشر البنية التحتية لـ Cloudflare في دقائق.

## ✅ المتطلبات

- [ ] Node.js 18+ مثبت
- [ ] حساب Cloudflare (مجاني أو مدفوع)
- [ ] Git
- [ ] GitHub repository access

## 📦 الإعداد السريع (5 دقائق)

### 1️⃣ Clone و Install

```bash
git clone https://github.com/YOUR_ORG/BSM.git
cd BSM
npm install
```

### 2️⃣ تسجيل الدخول إلى Cloudflare

```bash
npm install -g wrangler
wrangler login
```

سيفتح المتصفح - اتبع التعليمات للمصادقة.

### 3️⃣ Setup البنية التحتية

```bash
npm run deploy:setup
```

سيقوم بـ:
- ✅ إنشاء R2 Buckets
- ✅ إنشاء Pages project
- ✅ طلب إدخال الأسرار (API keys)

عند المطالبة:
- **OPENAI_API_KEY**: (اختياري) مفتاح OpenAI الخاص بك
- **ADMIN_TOKEN**: توكن قوي للمسؤول

### 4️⃣ النشر

```bash
# نشر Worker
npm run deploy:worker

# نشر Pages
npm run deploy:pages
```

## 🎉 انتهى!

خدماتك الآن متاحة على:

- **Worker API**: `https://lexchat.moteb.uk`
- **Frontend**: `https://lexdo.uk`

## 🔧 إعداد DNS (مرة واحدة)

### في Cloudflare Dashboard:

1. **Worker Domain**:
   - اذهب إلى: Workers & Pages → lexchat → Settings → Triggers
   - أضف Custom Domain: `lexchat.moteb.uk`

2. **Pages Domain**:
   - اذهب إلى: Workers & Pages → lexdo → Custom domains
   - أضف Domain: `lexdo.uk` و `www.lexdo.uk`

Cloudflare سيضيف DNS records تلقائياً! ⚡

## 🧪 الاختبار

```bash
# اختبار Worker
curl https://lexchat.moteb.uk/health

# اختبار معالجة صورة
curl -X POST https://lexchat.moteb.uk/process \
  -H "Content-Type: application/json" \
  -d '{"operation":"caption","imageUrl":"https://example.com/image.jpg"}'

# عرض Logs
npm run worker:logs
```

## 🔐 GitHub Actions (CI/CD)

### إعداد Secrets:

1. اذهب إلى: GitHub Repo → Settings → Secrets → Actions
2. أضف:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

**الحصول على API Token**:
1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Edit Cloudflare Workers
3. انسخ Token

الآن كل push إلى `main` سينشر تلقائياً! 🎉

## 📱 الاستخدام في الكود

```javascript
// في الواجهة الأمامية (app/app.js)
const response = await fetch('https://lexchat.moteb.uk/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'analyze',
    imageUrl: 'https://example.com/image.jpg'
  })
});

const result = await response.json();
console.log(result.data);
```

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `Bucket not found` | `npm run deploy:setup` |
| `Unauthorized` | `wrangler login` |
| `Secret not found` | `npm run worker:secrets` |
| `Route already exists` | احذف من Dashboard → Workers Routes |

## 📚 الوثائق الكاملة

للحصول على معلومات تفصيلية:
- [Cloudflare Infrastructure Guide](docs/CLOUDFLARE-INFRASTRUCTURE.md)
- [Worker README](workers/lexchat/README.md)
- [Deployment Scripts](scripts/)

## 💡 نصائح سريعة

### التطوير المحلي
```bash
cd workers/lexchat
npm run dev
# Worker على http://localhost:8787
```

### عرض Logs
```bash
npm run worker:logs
```

### تحديث الأسرار
```bash
npm run worker:secrets
```

### النشر إلى Staging
```bash
npm run deploy:worker:staging
```

## ✅ Checklist

- [ ] تم تثبيت Node.js و npm
- [ ] تم تسجيل الدخول لـ Cloudflare
- [ ] تم إنشاء R2 Buckets
- [ ] تم تعيين الأسرار (API keys)
- [ ] تم نشر Worker
- [ ] تم نشر Pages
- [ ] تم إعداد Custom domains
- [ ] تم إعداد GitHub Secrets (للـ CI/CD)
- [ ] تم اختبار Endpoints
- [ ] تم مراجعة Logs

## 🎯 الخطوات التالية

1. ✅ راجع [docs/CLOUDFLARE-INFRASTRUCTURE.md](docs/CLOUDFLARE-INFRASTRUCTURE.md) للتفاصيل
2. ✅ افتح Cloudflare Dashboard للمراقبة
3. ✅ اختبر جميع Endpoints
4. ✅ راجع Logs بانتظام
5. ✅ أضف ميزات جديدة!

---

**⏱️ الوقت الإجمالي**: ~10-15 دقيقة  
**🔧 الصعوبة**: سهل  
**📖 المساعدة**: راجع الوثائق الكاملة أو Cloudflare Dashboard

*تم الإنشاء بواسطة BSM Autonomous Architect* 🤖
