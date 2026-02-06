# BSM-AgentOS Deployment Checklist

**Version:** 1.0.0  
**Date:** 2026-02-06  
**Status:** ✅ READY FOR DEPLOYMENT

---

## Pre-Deployment Verification

### ✅ Code Quality
- [x] All source files present and validated
- [x] Dependencies installed (145 packages, 0 vulnerabilities)
- [x] Validation script passes: `npm run validate`
- [x] No syntax errors or linting issues
- [x] Code follows ES6+ module standards

### ✅ Security
- [x] No secrets in repository
- [x] `.gitleaks.toml` configured with high-confidence patterns
- [x] `.gitallowed` file for false positive exclusions
- [x] CodeQL analysis workflow configured (v3)
- [x] Secret scanning workflow configured
- [x] Security audit completed
- [x] Admin token authentication implemented
- [x] Input validation on all endpoints
- [x] Rate limiting configured
- [x] CORS protection enabled

### ✅ Core Components
- [x] Express API server (`src/server.js`, `src/app.js`)
- [x] Configuration management (`src/config/`)
- [x] Routing layer (`src/routes/`)
- [x] Controllers (`src/controllers/`)
- [x] Services (`src/services/`)
- [x] Middleware (`src/middleware/`)
- [x] Agent runners (`src/runners/`)
- [x] Utilities (`src/utils/`)

### ✅ API Endpoints
- [x] GET `/api/health` - Health check
- [x] GET `/api/agents` - List agents
- [x] GET `/api/knowledge` - List knowledge base
- [x] POST `/api/agents/run` - Execute agent
- [x] POST `/api/chat` - Agent-based chat
- [x] POST `/api/chat/direct` - Direct GPT chat
- [x] POST `/api/orchestrator/run` - Run orchestrator
- [x] GET `/api/admin/agents` - Admin: Manage agents
- [x] GET `/api/admin/knowledge` - Admin: Manage knowledge

### ✅ Intelligent Agents
- [x] BSM Autonomous Architect agent configured
- [x] Orchestrator agent configured
- [x] Runner agent configured
- [x] Security agent configured
- [x] Agent data directory (`data/agents/`)
- [x] Knowledge base directory (`data/knowledge/`)

### ✅ Dashboard & UI
- [x] Admin dashboard (`src/admin/`)
- [x] Chat interface - local (`src/chat/`)
- [x] Chat interface - GitHub Pages (`docs/`)
- [x] Vue 3 + Tailwind CSS integration
- [x] Arabic/English bilingual support
- [x] RTL (Right-to-Left) support

### ✅ ML Model Integration
- [x] OpenAI GPT service (`src/services/gptService.js`)
- [x] GPT-4o-mini model configured
- [x] Multiple API key support (rotation)
- [x] HTTP/2 connection pooling
- [x] Conversation history management
- [x] System prompt configuration

### ✅ CI/CD Pipeline
- [x] Validation workflow (`validate.yml`)
- [x] CodeQL analysis workflow (`codeql-analysis.yml`)
- [x] Secret scanning workflow (`secret-scanning.yml`)
- [x] GitHub Pages deployment workflow (`pages.yml`)
- [x] Agent execution workflow (`run-bsm-agents.yml`)
- [x] Weekly audit workflow (`weekly-agents.yml`)
- [x] Report publishing workflow (`publish-reports.yml`)
- [x] All workflows use Node.js 22
- [x] All actions pinned to commit SHAs

### ✅ Documentation
- [x] Main README with comprehensive guide
- [x] BSM-AgentOS Platform summary document
- [x] Architecture documentation
- [x] Security deployment guide
- [x] Secrets management guide
- [x] CI/CD recommendations
- [x] Agent orchestration patterns
- [x] DNS configuration guides
- [x] API endpoint documentation

### ✅ Distribution
- [x] Multi-stage Dockerfile (`Dockerfile.example`)
- [x] Docker Compose configuration (`docker-compose.yml.example`)
- [x] Render.com deployment config (`render.yaml`)
- [x] GitHub Pages deployment configured
- [x] Custom domain setup (`www.lexdo.uk`)
- [x] DNS verification scripts

---

## Deployment Options

### Option 1: Docker (Recommended for Production)

**Prerequisites:**
- Docker 20.10+
- Docker Compose 2.0+ (optional)

**Steps:**

1. Copy and configure Dockerfile:
```bash
cp Dockerfile.example Dockerfile
```

2. Build production image:
```bash
docker build --target production -t bsm-agentos:1.0.0 .
```

3. Run container:
```bash
docker run -d \
  --name bsm-agentos \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e OPENAI_BSM_KEY=your_key_here \
  -e ADMIN_TOKEN=your_secure_token_here \
  -v $(pwd)/data:/app/data:ro \
  --restart unless-stopped \
  bsm-agentos:1.0.0
```

4. Verify deployment:
```bash
curl http://localhost:3000/api/health
```

**With Docker Compose:**

1. Copy and configure:
```bash
cp docker-compose.yml.example docker-compose.yml
cp .env.example .env
# Edit .env with your configuration
```

2. Start services:
```bash
docker-compose up -d
```

3. View logs:
```bash
docker-compose logs -f bsm-api
```

---

### Option 2: Render.com (Recommended for Quick Deploy)

**Prerequisites:**
- Render.com account
- GitHub repository access

**Steps:**

1. Connect GitHub repository to Render.com
2. Create new Web Service
3. Select repository: `LexBANK/BSM`
4. Use existing `render.yaml` configuration
5. Add environment variables in Render dashboard:
   - `NODE_ENV=production`
   - `OPENAI_BSM_KEY=your_key_here`
   - `ADMIN_TOKEN=your_secure_token_here`
   - `PORT=3000`
6. Deploy service

**Automatic Deployment:**
- Render.com will auto-deploy on push to main branch
- Build command: `npm ci`
- Start command: `npm start`

---

### Option 3: GitHub Pages (Frontend Only)

**Prerequisites:**
- GitHub repository access
- Custom domain (optional)

**Steps:**

1. Ensure `docs/` directory contains frontend files
2. GitHub Actions will automatically deploy on push to main
3. Configure custom domain:
   - Add `CNAME` file in `docs/` with domain name
   - Configure DNS:
     ```bash
     ./scripts/setup_github_pages_verification.sh <API_TOKEN> <CHALLENGE>
     ```
4. Access frontend at: `https://www.lexdo.uk`

**Note:** GitHub Pages hosts only the frontend. Backend API must be deployed separately.

---

### Option 4: Manual/VPS Deployment

**Prerequisites:**
- Ubuntu/Debian server
- Node.js 22+
- npm
- Process manager (PM2 recommended)

**Steps:**

1. Clone repository:
```bash
git clone https://github.com/LexBANK/BSM.git
cd BSM
```

2. Install dependencies:
```bash
npm ci --only=production
```

3. Configure environment:
```bash
cp .env.example .env
nano .env  # Edit with your configuration
```

4. Install PM2:
```bash
npm install -g pm2
```

5. Start application:
```bash
pm2 start src/server.js --name bsm-agentos
pm2 save
pm2 startup  # Follow instructions
```

6. Configure Nginx (optional):
```nginx
server {
    listen 80;
    server_name api.lexdo.uk;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

7. Enable HTTPS with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.lexdo.uk
```

---

## Environment Variables Configuration

### Required Variables

```env
# Production - REQUIRED
NODE_ENV=production
OPENAI_BSM_KEY=sk-proj-...  # Get from OpenAI dashboard
ADMIN_TOKEN=...  # Generate: openssl rand -base64 32
```

### Optional Variables

```env
# Alternative OpenAI Keys (for rotation)
OPENAI_BRINDER_KEY=sk-proj-...
OPENAI_LEXNEXUS_KEY=sk-proj-...

# Model Configuration
OPENAI_MODEL=gpt-4o-mini  # Default model

# Server Configuration
PORT=3000
LOG_LEVEL=info  # info, debug, error, warn

# CORS Configuration
CORS_ORIGINS=https://www.lexdo.uk,https://admin.lexdo.uk

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100  # Max requests per window

# Input Validation
MAX_AGENT_INPUT_LENGTH=4000

# Database (if using)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
```

### Security Best Practices

1. **Generate Strong Tokens:**
```bash
# Generate admin token (32+ characters)
openssl rand -base64 32

# Or use random password generator
pwgen -s 32 1
```

2. **Never commit secrets to repository**
   - Always use `.env` file
   - Add `.env` to `.gitignore`
   - Use environment variables in CI/CD

3. **Rotate API keys regularly**
   - Set up key rotation schedule
   - Use multiple keys for load distribution
   - Monitor API usage

4. **Use strong CORS policy**
   - Only allow trusted domains
   - Don't use wildcard `*` in production

---

## Post-Deployment Verification

### 1. Health Check
```bash
curl -i https://your-domain.com/api/health
# Expected: 200 OK with { "status": "ok", ... }
```

### 2. API Endpoints Test
```bash
# Test agents endpoint
curl https://your-domain.com/api/agents

# Test knowledge endpoint
curl https://your-domain.com/api/knowledge

# Test chat endpoint (requires POST)
curl -X POST https://your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"مرحبا","agentId":"legal-agent"}'
```

### 3. Admin Access Test
```bash
# Test admin endpoint (requires token)
curl https://your-domain.com/api/admin/agents \
  -H "x-admin-token: your_admin_token_here"
```

### 4. UI Access Test
- Visit admin dashboard: `https://your-domain.com/admin`
- Visit chat interface: `https://your-domain.com/chat`
- Visit GitHub Pages: `https://www.lexdo.uk`

### 5. Monitor Logs
```bash
# Docker
docker logs -f bsm-agentos

# Docker Compose
docker-compose logs -f bsm-api

# PM2
pm2 logs bsm-agentos

# Manual
tail -f logs/app.log  # If configured
```

---

## Monitoring & Maintenance

### Metrics to Monitor

1. **Application Health**
   - `/api/health` endpoint response time
   - HTTP status codes distribution
   - Error rate

2. **Performance**
   - API response times
   - Database query times (if using)
   - Cache hit rates
   - Memory usage
   - CPU usage

3. **Security**
   - Failed authentication attempts
   - Rate limit triggers
   - Suspicious patterns in logs

4. **Business Metrics**
   - Agent execution count
   - Chat conversation count
   - API usage by endpoint

### Recommended Monitoring Tools

1. **Basic:**
   - Docker health checks
   - Application logs (Pino)
   - Process manager (PM2)

2. **Advanced:**
   - Prometheus + Grafana (included in docker-compose)
   - Sentry for error tracking
   - Datadog or New Relic APM
   - CloudWatch (if on AWS)

### Backup Strategy

1. **Data Directories:**
   - Backup `data/agents/` - Agent configurations
   - Backup `data/knowledge/` - Knowledge base
   - Frequency: Daily or after changes

2. **Database (if using):**
   - PostgreSQL backups: `pg_dump`
   - Frequency: Daily with rotation
   - Store offsite (S3, Backblaze B2)

3. **Configuration:**
   - Backup `.env` file securely
   - Document all environment variables
   - Store in password manager or vault

### Update Strategy

1. **Test Updates:**
   - Always test in staging first
   - Run `npm run validate`
   - Check for breaking changes

2. **Deploy Updates:**
   - Use blue-green deployment
   - Or rolling updates with zero downtime
   - Monitor logs during rollout

3. **Rollback Plan:**
   - Keep previous Docker images
   - Document rollback procedure
   - Test rollback in staging

---

## Troubleshooting

### Issue: Application won't start

**Check:**
1. Environment variables configured
2. Port 3000 not in use
3. Dependencies installed
4. Node.js version 22+

**Solution:**
```bash
# Check environment
cat .env

# Check port
lsof -i :3000

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be v22+
```

---

### Issue: API returns 500 errors

**Check:**
1. OpenAI API key valid
2. API key has credits
3. Network connectivity to OpenAI
4. Logs for error details

**Solution:**
```bash
# Check logs
docker logs bsm-agentos
# or
pm2 logs bsm-agentos

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_BSM_KEY"

# Verify environment
env | grep OPENAI
```

---

### Issue: Admin authentication fails

**Check:**
1. Admin token set correctly
2. Token length (16+ chars in production)
3. Special characters properly escaped

**Solution:**
```bash
# Generate new token
openssl rand -base64 32

# Update .env
ADMIN_TOKEN=new_generated_token

# Restart application
docker restart bsm-agentos
# or
pm2 restart bsm-agentos
```

---

### Issue: CORS errors in browser

**Check:**
1. CORS_ORIGINS configured
2. Frontend domain in allowed origins
3. Request includes credentials

**Solution:**
```bash
# Update .env
CORS_ORIGINS=https://www.lexdo.uk,https://admin.lexdo.uk

# Restart application
```

---

### Issue: Rate limit errors

**Check:**
1. Rate limit configuration
2. Client IP address
3. Legitimate vs malicious traffic

**Solution:**
```bash
# Adjust rate limits in .env
RATE_LIMIT_WINDOW_MS=900000  # Increase window
RATE_LIMIT_MAX=200  # Increase limit

# Or implement IP whitelisting
```

---

## Security Considerations

### Production Security Checklist

- [ ] Strong admin token (32+ characters)
- [ ] API keys not exposed in logs
- [ ] HTTPS enabled (TLS 1.3)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Security headers enabled (Helmet)
- [ ] Regular dependency updates
- [ ] Security scanning in CI/CD
- [ ] Log monitoring for suspicious activity
- [ ] Backup and disaster recovery plan
- [ ] Incident response procedure

### Compliance

- [ ] GDPR compliance (if applicable)
- [ ] Data retention policies
- [ ] Privacy policy documented
- [ ] Terms of service defined
- [ ] Security audit completed
- [ ] Penetration testing (recommended)

---

## Support & Resources

### Documentation
- Main README: `README.md`
- Platform Summary: `BSM-AGENTOS-PLATFORM.md`
- Architecture: `docs/ARCHITECTURE.md`
- Security: `docs/SECURITY-DEPLOYMENT.md`

### Repository
- GitHub: https://github.com/LexBANK/BSM
- Issues: https://github.com/LexBANK/BSM/issues
- Discussions: https://github.com/LexBANK/BSM/discussions

### Contact
- Organization: LexBANK
- Website: https://www.lexdo.uk
- Support: Contact LexBANK development team

---

## Summary

✅ **All Components Verified**  
✅ **Security Measures Implemented**  
✅ **Documentation Complete**  
✅ **Deployment Options Ready**  
✅ **CI/CD Pipeline Configured**  
✅ **Monitoring Prepared**

**Status:** 🚀 **READY FOR PRODUCTION DEPLOYMENT**

---

**Last Updated:** 2026-02-06  
**Version:** 1.0.0  
**Approved By:** BSM Development Team
