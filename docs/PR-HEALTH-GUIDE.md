# PR Health Guide - دليل صحة طلبات السحب

## Overview | نظرة عامة

This guide provides comprehensive information about maintaining healthy pull requests in the BSM repository.

يوفر هذا الدليل معلومات شاملة حول الحفاظ على صحة طلبات السحب في مستودع BSM.

## PR Quality Gates | بوابات جودة طلبات السحب

### 1. Code Review Score | نتيجة مراجعة الكود
- **Minimum Score**: 7/10
- **Agent**: CodeReviewAgent
- **Requirements**:
  - Clear code structure
  - Proper error handling
  - Follow coding conventions
  - Adequate documentation

### 2. Security Scan | فحص الأمان
- **Critical Vulnerabilities**: 0
- **Agent**: SecurityScanner
- **Checks**:
  - No critical CVEs in dependencies
  - Secure coding practices
  - No exposed secrets
  - Proper input validation

### 3. Integrity Check | فحص السلامة
- **Health Score**: > 90/100
- **Agent**: IntegrityAgent
- **Monitors**:
  - Stale PRs (>30 days)
  - Old issues (>90 days)
  - Repository health metrics

## Common PR Issues | المشاكل الشائعة في طلبات السحب

### Issue 1: CI/CD Workflow Failures
**Symptoms | الأعراض:**
- ❌ Failed workflow runs
- ⚠️ Missing secrets
- 🔄 Incomplete test execution

**Solutions | الحلول:**
```bash
# Check workflow logs
gh run view --log-failed

# Verify secrets are configured
gh secret list

# Re-run failed workflows
gh run rerun <run-id>
```

### Issue 2: Stale Pull Requests
**Symptoms | الأعراض:**
- 📅 No updates for >30 days
- 🔀 Merge conflicts with main
- 📊 Outdated dependencies

**Solutions | الحلول:**
```bash
# Update from main
git checkout <branch>
git fetch origin
git rebase origin/main

# Push updates
git push --force-with-lease
```

### Issue 3: CommonJS vs ES Modules
**Symptoms | الأعراض:**
- ❌ `require() of ES Module` errors
- ⚠️ Import/export syntax errors

**Solutions | الحلول:**
```javascript
// ❌ Wrong (CommonJS in ES Module project)
const { agent } = require('./agent.js');

// ✅ Correct (ES Modules)
import { agent } from './agent.js';

// For dynamic imports
const { agent } = await import('./agent.js');
```

## PR Lifecycle | دورة حياة طلب السحب

```
1. Create PR → 2. CI Checks → 3. Agent Review → 4. Manual Review → 5. Merge
   إنشاء        فحوصات CI      مراجعة Agent    مراجعة يدوية      دمج
```

### Automated Checks
1. **Validation** (`validate.yml`)
   - Agent YAML validation
   - Structure verification
   
2. **Agent Review** (`auto-merge.yml`)
   - Code review (7/10 min)
   - Security scan (0 critical)
   - Integrity check (90/100 min)

3. **Build & Deploy** (`unified-ci-deploy.yml`)
   - Install dependencies
   - Run tests
   - Build project
   - Deploy to Render (main only)

## Best Practices | أفضل الممارسات

### 1. Keep PRs Small
- ✅ < 400 lines of code changes
- ✅ Single focused feature/fix
- ✅ Clear commit messages

### 2. Write Clear Descriptions
```markdown
## Summary
Brief description of changes

## Changes Made
- Added X feature
- Fixed Y bug
- Updated Z documentation

## Testing
- [ ] Manual testing completed
- [ ] CI tests pass
- [ ] Security scan clean
```

### 3. Respond Promptly
- ⏰ Address feedback within 48 hours
- 💬 Reply to all review comments
- ✅ Update PR status regularly

### 4. Keep Updated
```bash
# Daily: sync with main
git fetch origin main
git rebase origin/main

# Before merge: final sync
git pull --rebase origin main
```

## PR Health Metrics | مقاييس صحة طلبات السحب

| Metric | Green ✅ | Yellow ⚠️ | Red ❌ |
|--------|---------|-----------|--------|
| Age | < 7 days | 7-30 days | > 30 days |
| CI Status | All passing | Some pending | Failures |
| Conflicts | None | Resolvable | Complex |
| Reviews | Approved | Pending | Changes req. |
| Code Score | ≥ 8/10 | 7/10 | < 7/10 |

## Workflow Commands | أوامر سير العمل

```bash
# List open PRs
gh pr list --state open

# Check PR status
gh pr view <number>

# Check CI status
gh pr checks <number>

# Request review
gh pr review <number> --approve

# Merge PR
gh pr merge <number> --squash --delete-branch

# Close stale PR
gh pr close <number> --comment "Closing due to inactivity"
```

## Troubleshooting | استكشاف الأخطاء

### Problem: Auto-merge not triggering
**Check:**
1. All required checks passing?
2. Code score ≥ 7/10?
3. No security vulnerabilities?
4. Branch up to date with main?

### Problem: Workflow secrets missing
**Solution:**
```bash
# Repository secrets needed:
# - OPENAI_BSM_KEY (for CodeReviewAgent)
# - PERPLEXITY_KEY (for SecurityScanner)
# - RENDER_API_KEY (for deployments)
# - RENDER_SERVICE_ID (for deployments)

# Verify in repository settings → Secrets and variables → Actions
```

### Problem: ES Module errors in CI
**Solution:**
Update workflow to use ES modules:
```yaml
- run: node --input-type=module -e "import { x } from './file.js'; ..."
```

## Integration Agent Usage | استخدام وكلاء التكامل

### IntegrityAgent
```bash
# Generate health report
node --input-type=module -e "
import { integrityAgent } from './src/agents/IntegrityAgent.js';
const report = integrityAgent.check({
  prs: [], // Array of PR objects
  issues: [] // Array of issue objects
});
console.log(JSON.stringify(report, null, 2));
"
```

### CodeReviewAgent
```bash
# Review PR changes
node --input-type=module -e "
import { codeReviewAgent } from './src/agents/CodeReviewAgent.js';
const result = await codeReviewAgent.review({
  prNumber: 123,
  files: [{filename: 'src/app.js', changes: 50}],
  diff: '...',
  author: 'username'
});
console.log('Score:', result.score);
"
```

## Resources | الموارد

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [BSM Agent System](./AGENTS-GUIDE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

**Last Updated**: 2026-02-09  
**Maintained By**: BSU Integrity Agent
