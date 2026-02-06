# ✅ BSM Security - Quick Action Checklist

**Generated:** 2026-02-06  
**For:** Development & DevOps Teams  
**Priority:** Immediate to Long-term

---

## 🚨 This Week (Immediate Actions)

### 1. Enable Dependabot (15 minutes) ⚡
**Priority:** P3 | **Effort:** Very Low

```bash
# Create .github/dependabot.yml
cat > .github/dependabot.yml << 'EOF'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
EOF

git add .github/dependabot.yml
git commit -m "security: enable Dependabot for automated dependency updates"
git push
```

**✅ Done when:** Dependabot PR appears within 1 week

---

### 2. Create Secrets Inventory (2 hours) 📋
**Priority:** P3 | **Effort:** Low

```bash
# Create documentation directory if needed
mkdir -p docs

# Create secrets inventory
cat > docs/SECRETS-INVENTORY.md << 'EOF'
# BSM Secrets Inventory

**Last Updated:** YYYY-MM-DD  
**Owner:** DevOps Team

## Production Secrets

| Secret Name | Type | Location | Owner | Last Rotated | Next Rotation | Notes |
|-------------|------|----------|-------|--------------|---------------|-------|
| OPENAI_BSM_KEY | API Key | .env, GitHub Secrets | DevOps | YYYY-MM-DD | +90 days | Primary OpenAI key |
| OPENAI_BRINDER_KEY | API Key | .env, GitHub Secrets | DevOps | YYYY-MM-DD | +90 days | Brinder service |
| OPENAI_LEXNEXUS_KEY | API Key | .env, GitHub Secrets | DevOps | YYYY-MM-DD | +90 days | LexNexus service |
| ADMIN_TOKEN | Auth Token | .env | Security | YYYY-MM-DD | +90 days | Admin authentication |

## CI/CD Secrets

| Secret Name | Type | Location | Owner | Last Rotated | Next Rotation | Notes |
|-------------|------|----------|-------|--------------|---------------|-------|
| KM_ENDPOINT | URL | GitHub Secrets | DevOps | N/A | N/A | Key Management endpoint |
| KM_TOKEN | Auth Token | GitHub Secrets | DevOps | YYYY-MM-DD | +90 days | KM authentication |
| SNYK_TOKEN | API Token | GitHub Secrets | Security | YYYY-MM-DD | +60 days | Security scanning |

## Rotation Policy

- **API Keys (Critical):** Every 90 days
- **Auth Tokens:** Every 90 days
- **GitHub PATs:** Every 60 days

## Emergency Contacts

- **DevOps Lead:** [Name/Email]
- **Security Officer:** [Name/Email]
- **On-call:** [Slack/PagerDuty]
EOF

git add docs/SECRETS-INVENTORY.md
git commit -m "docs: add secrets inventory"
git push
```

**✅ Done when:** File committed and shared with team

---

### 3. Run Security Baseline (1 hour) 🔍
**Priority:** P2 | **Effort:** Low

```bash
# Make sure scripts are executable
chmod +x scripts/security-check.sh

# Run security check and save baseline
./scripts/security-check.sh > reports/security-baseline-$(date +%Y-%m-%d).txt

# Run npm audit and save results
npm audit --json > reports/npm-audit-$(date +%Y-%m-%d).json

# Commit baseline reports
git add reports/security-baseline-*.txt reports/npm-audit-*.json
git commit -m "security: add security baseline reports"
git push
```

**✅ Done when:** Baseline reports committed to repository

---

### 4. Document Secret Rotation Procedures (3 hours) 📖
**Priority:** P2 | **Effort:** Low

```bash
# Create rotation guide
cat > docs/SECRET-ROTATION-GUIDE.md << 'EOF'
# Secret Rotation Guide

## Overview
This guide provides step-by-step procedures for rotating BSM platform secrets.

## OpenAI API Keys

**Frequency:** Every 90 days  
**Owner:** DevOps Team

### Procedure:
1. **Generate new key:**
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name it: `bsm-production-YYYY-MM-DD`
   - Copy the key (you won't see it again)

2. **Test in staging:**
   ```bash
   # Update staging .env
   OPENAI_BSM_KEY=sk-new-key-here
   
   # Restart staging
   # Test all endpoints
   ```

3. **Update production:**
   ```bash
   # Update production .env or KMS
   # Restart application
   # Monitor logs for 5 minutes
   ```

4. **Verify and cleanup:**
   - Test production endpoints
   - Monitor error rates
   - Wait 24 hours (grace period)
   - Revoke old key at OpenAI dashboard

5. **Document:**
   - Update SECRETS-INVENTORY.md with rotation date
   - Update next rotation date (+90 days)

### Emergency Rotation:
If key is compromised, skip grace period and revoke immediately after updating.

## Admin Token

**Frequency:** Every 90 days  
**Owner:** Security Team

### Procedure:
1. **Generate strong token:**
   ```bash
   # Generate 32-character token
   openssl rand -base64 32
   ```

2. **Update configuration:**
   ```bash
   # Update .env (or KMS)
   ADMIN_TOKEN=<new-token-here>
   
   # Restart application
   ```

3. **Test:**
   ```bash
   # Test admin endpoint
   curl -H "X-Admin-Token: <new-token>" https://api.example.com/admin
   ```

4. **Notify team:**
   - Send secure notification to authorized users
   - Update password managers
   - Update documentation

5. **Document rotation date**

## GitHub Secrets

**Frequency:** 60-90 days  
**Owner:** DevOps Team

### Procedure:
1. Go to GitHub repository Settings > Secrets
2. Click "Update" next to secret name
3. Enter new value
4. Click "Update secret"
5. Test CI/CD workflows
6. Document rotation date

## Emergency Response

If a secret is detected in Git history:
1. **Rotate immediately** (0-15 minutes)
2. **Remove from Git** (15-60 minutes)
3. **Verify removal** (60-120 minutes)
4. **Document incident** (1-7 days)

See: docs/SECRET-LEAK-RESPONSE.md for detailed procedures.
EOF

git add docs/SECRET-ROTATION-GUIDE.md
git commit -m "docs: add secret rotation procedures"
git push
```

**✅ Done when:** Document committed and team trained

---

## 📅 This Month (Short-term Actions)

### 5. Implement Log Sanitization (1 day) 🔐
**Priority:** P2 | **Effort:** Low

**File:** `src/utils/logger.js`

```javascript
import pino from "pino";
import { env } from "../config/env.js";

const logger = pino({
  level: env.logLevel,
  // Add redaction configuration
  redact: {
    paths: [
      // Request headers
      'req.headers.authorization',
      'req.headers["x-admin-token"]',
      'req.headers["x-api-key"]',
      
      // Response headers
      'res.headers.authorization',
      'res.headers["x-admin-token"]',
      
      // Generic patterns
      '*.apiKey',
      '*.token',
      '*.password',
      '*.secret',
      '*.authorization'
    ],
    remove: true  // Remove the field entirely
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  }
});

export default logger;
```

**Test:**
```javascript
// This should be redacted in logs
logger.info({ 
  req: { 
    headers: { 
      'x-admin-token': 'secret123' 
    } 
  } 
}, 'Request received');

// Output should show: { req: { headers: {} } }
```

**✅ Done when:** Tests pass and secrets don't appear in logs

---

### 6. Add Container Scanning (4 hours) 🐳
**Priority:** P2 | **Effort:** Low

**File:** `.github/workflows/container-scan.yml`

```yaml
name: Container Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Mondays

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -f Dockerfile.example -t bsm:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'bsm:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Fail on high vulnerabilities
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'bsm:${{ github.sha }}'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'
```

**✅ Done when:** Workflow runs successfully on next push

---

### 7. Enhanced Admin Rate Limiting (2 hours) 🚦
**Priority:** P2 | **Effort:** Low

**File:** `src/app.js`

Add after existing rate limiting:

```javascript
import rateLimit from "express-rate-limit";

// Existing global rate limiter
app.use("/api", rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false
}));

// NEW: Stricter rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    error: "Too many authentication attempts. Please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip for successful authenticated requests (optional)
  skip: (req, res) => {
    // If authentication succeeds, don't count against limit
    return res.statusCode === 200;
  }
});

// Apply to admin routes
app.use("/admin", adminLimiter);
app.use("/api/admin", adminLimiter);
```

**Test:**
```bash
# Should be blocked after 10 attempts
for i in {1..12}; do
  curl -H "X-Admin-Token: wrong" http://localhost:3000/admin
  echo "Attempt $i"
done
```

**✅ Done when:** Rate limiting blocks after 10 failed attempts

---

### 8. Choose KMS Provider (8 hours) ☁️
**Priority:** P1 | **Effort:** Medium

**Evaluation Checklist:**

```markdown
# KMS Provider Evaluation

## Criteria
- [ ] Cost fits budget
- [ ] Supports automatic rotation
- [ ] Compatible with deployment platform
- [ ] Has audit logging
- [ ] Meets compliance requirements
- [ ] Team has expertise (or training available)

## AWS Secrets Manager
**Pros:**
- Built-in rotation
- CloudTrail integration
- Simple API

**Cons:**
- AWS-specific
- $0.40/secret/month

**Score:** ___/10

## Google Secret Manager
**Pros:**
- Low cost ($0.06/secret/month)
- Simple setup
- Cloud Audit Logs

**Cons:**
- GCP-specific
- Manual rotation

**Score:** ___/10

## Azure Key Vault
**Pros:**
- HSM support
- Auto-rotation
- Azure integration

**Cons:**
- Azure-specific
- Medium complexity

**Score:** ___/10

## HashiCorp Vault
**Pros:**
- Platform-agnostic
- Open source
- Feature-rich

**Cons:**
- High complexity
- Self-hosted

**Score:** ___/10

## Decision: ________________

**Rationale:**
- Deployment platform: ___________
- Budget: ___________
- Timeline: ___________
- Team expertise: ___________
```

**✅ Done when:** Decision documented and approved by team

---

## 📆 This Quarter (Medium-term Actions)

### 9. Migrate to KMS (2-3 months) 🔐
**Priority:** P1 | **Effort:** High

See [`KEY-MANAGEMENT-GUIDE.md`](./KEY-MANAGEMENT-GUIDE.md) for detailed implementation guide.

**Milestones:**
- [ ] Week 1-2: Set up KMS in dev/staging
- [ ] Week 3-4: Implement integration code
- [ ] Week 5-6: Test in staging
- [ ] Week 7-8: Migrate production secrets
- [ ] Week 9-10: Implement automated rotation
- [ ] Week 11-12: Documentation and training

**✅ Done when:** All production secrets in KMS with automated rotation

---

### 10. External Security Audit (Ongoing) 🔍
**Priority:** P2 | **Effort:** External

**Action Items:**
- [ ] Get quotes from 3 security firms
- [ ] Select vendor based on expertise and cost
- [ ] Schedule penetration testing
- [ ] Review and address findings
- [ ] Document improvements
- [ ] Obtain security certification (optional)

**Recommended Vendors:**
- HackerOne
- Bugcrowd
- Cobalt
- Synack

**✅ Done when:** Audit complete and findings addressed

---

## 🎯 Success Metrics

Track these metrics monthly:

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Dependency Vulnerabilities | 0 | 0 | ✅ |
| Secret Scanning Pass Rate | 100% | 100% | ✅ |
| Secrets in KMS | 0 | 100% | 📋 In Progress |
| Secret Age (avg) | N/A | <90 days | 📋 Pending |
| Failed Auth Attempts | Monitor | <10/day | 📋 Setup |
| Security Incidents | 0 | 0 | ✅ |
| Container Scan Pass Rate | N/A | 100% | 📋 Setup |

---

## 📞 Need Help?

**Questions about:**
- **Secrets inventory:** Contact DevOps Lead
- **Rotation procedures:** Contact Security Team
- **KMS implementation:** Contact DevOps Team
- **Security policy:** Contact Security Officer

**Emergency:**
- **Secret leak detected:** Follow `docs/SECRET-LEAK-RESPONSE.md`
- **Security incident:** Contact Security Team immediately

---

## 🔄 Review Schedule

- **Weekly:** Security scan results
- **Monthly:** Metrics review
- **Quarterly:** Security audit
- **Annually:** External penetration test

---

**Last Updated:** 2026-02-06  
**Next Review:** 2026-03-06  
**Owner:** Security Team

---

**For detailed security analysis, see:**
- [`SECURITY-AUDIT.md`](./SECURITY-AUDIT.md) - Full audit report
- [`SECURITY-SUMMARY.md`](./SECURITY-SUMMARY.md) - Executive summary
- [`KEY-MANAGEMENT-GUIDE.md`](./KEY-MANAGEMENT-GUIDE.md) - KMS implementation
- [`security-findings.json`](./security-findings.json) - Machine-readable findings
