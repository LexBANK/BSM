# 📘 Git Workflow for BSM

**Final Approved Version**

- **Document Status:** ✅ Final
- **Applies To:** LexBANK / BSM
- **Audience:** Backend, DevOps, Security
- **Last Review:** 2026-02-10

---

## 🎯 الهدف

- ضبط سير العمل في بيئة متعددة المطورين.
- تقليل أخطاء الدمج (Merge Conflicts).
- حماية الفروع الحرجة.
- تحسين قابلية التتبع والمراجعة.

---

## 🔒 القواعد الذهبية (Non-Negotiable)

❗ **ممنوع منعًا باتًا على الفروع المحمية** (`main`, `develop`, `release/*`):

- `git reset`
- `git push --force`
- `git rebase`

✔️ **المسموح:**

- `git revert`
- `git merge --no-ff`
- Pull Requests فقط

---

## 🧭 استراتيجية الفروع المعتمدة

| الفرع | الغرض |
|---|---|
| `main` | إنتاج (Production) |
| `develop` | دمج الميزات |
| `feature/*` | تطوير ميزة |
| `hotfix/*` | إصلاح عاجل |
| `release/*` | تجهيز إصدار |

---

## 🧹 1) `git stash` – إدارة التغييرات المؤقتة

استخدمه عندما تحتاج تبديل السياق بسرعة بدون Commit.

```bash
git stash push -m "BSM-AGENT: WIP on manifests" src/services/agents/
git checkout main
git pull origin main
git checkout feature-agent-manifests
git stash pop
```

---

## 🍒 2) `git cherry-pick` – نقل إصلاحات محددة

لإصلاحات أمنية أو حرجة فقط.

```bash
git checkout release/v1.2
git cherry-pick abc123
```

في حال التعارض:

```bash
git add .
git cherry-pick --continue
```

---

## 🔄 3) `git revert` – التراجع الآمن في الإنتاج

```bash
git revert abc123 --no-edit
```

✔️ الخيار الوحيد المسموح على `main`.

---

## 🔙 4) `git reset` – للفروع الشخصية فقط

```bash
git reset HEAD~1        # keep changes
git reset --soft HEAD~1
git reset --hard HEAD~3 # ⚠️ local branch only
```

---

## 🔀 5) `git rebase -i` – تنظيف التاريخ قبل PR

```bash
git rebase -i HEAD~8
```

يُستخدم فقط على `feature/*` قبل فتح PR.

---

## 🔍 6) `git bisect` – اكتشاف Commit المسبب للمشكلة

```bash
git bisect start
git bisect bad
git bisect good abc123
# test…
git bisect reset
```

---

## 🧭 7) `git reflog` – إنقاذ الكوارث

```bash
git reflog
git reset --hard HEAD@{4}
```

---

## 🔄 8) `git merge --no-ff` – دمج الميزات

```bash
git checkout develop
git merge --no-ff feature-agent-state
```

✔️ يحافظ على تاريخ الميزة كاملًا.

---

## 🏷️ Naming Convention للـ Commits (معتمد)

```text
feat: add agent state persistence
fix: correct audit log format
chore: update dependencies
docs: update git workflow
test: add chat api tests
refactor: simplify agent runner
```

---

## ✅ Workflow مختصر ومعتمد

```bash
git checkout -b feature-agent-state
git add .
git commit -m "feat: add agent state persistence"
git checkout develop
git pull origin develop
git checkout feature-agent-state
git rebase develop
git push origin feature-agent-state
# Open PR to develop
```

---

## 🧠 ملاحظات ختامية

- هذا الدليل مرجع رسمي.
- أي استثناء يجب أن يكون موثّقًا.
- أي تعديل يتم عبر PR + Review.

---

## 🏁 الختم النهائي

**Approved by Architecture & Engineering**

**Effective immediately**
