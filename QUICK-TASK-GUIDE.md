# 🚀 دليل المهام السريع - Quick Task Guide

**Last Updated:** 2026-02-08  
**Purpose:** Fast reference for common BSU Platform operations  
**Audience:** Developers, Agents, Operations Team

---

## 🎯 Table of Contents

1. [Quick Start](#quick-start)
2. [Common Commands](#common-commands)
3. [Custom Agents](#custom-agents)
4. [PR Management](#pr-management)
5. [Testing & Validation](#testing--validation)
6. [Security Operations](#security-operations)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🏁 Quick Start

### First Time Setup
```bash
# Clone repository
git clone https://github.com/LexBANK/BSM.git
cd BSM

# Install dependencies
npm ci

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Verify installation
npm test
npm start
# Check http://localhost:3000/api/health
```

### Daily Workflow
```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm ci

# Run validation
npm test

# Start development
npm run dev
```

---

## ⚡ Common Commands

### Package Management
```bash
# Install all dependencies
npm ci

# Install clean (no cache)
npm ci --cache /tmp/empty-cache

# Update dependencies
npm update

# Check for vulnerabilities
npm audit
npm audit fix
```

### Development
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Run validation
npm test
npm run validate  # same as test
```

### Git Operations
```bash
# Check status
git status --short

# See what changed
git --no-pager diff

# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "Your message"

# Push changes
git push origin your-branch-name

# Update from main
git checkout main
git pull origin main
git checkout your-branch-name
git merge main
```

---

## 🤖 Custom Agents

### Available Agents

#### 1. BSU Autonomous Architect (تحليل معماري)
**Purpose:** Architecture analysis, recommendations, planning

```bash
# Analyze repository structure
copilot agents run bsu-autonomous-architect \
  --task "analyze repository structure and suggest improvements"

# Create refactoring plan
copilot agents run bsu-autonomous-architect \
  --task "create refactoring plan for service layer"

# Generate documentation
copilot agents run bsu-autonomous-architect \
  --task "generate API documentation"
```

#### 2. Orchestrator (تنسيق المهام)
**Purpose:** Coordinate multiple agents, complex workflows

```bash
# Orchestrate complete analysis
copilot agents run orchestrator \
  --task "run complete platform analysis with all agents"

# Coordinate multi-step deployment
copilot agents run orchestrator \
  --task "coordinate build, test, and deployment"
```

#### 3. Runner (تنفيذ البناء والاختبار)
**Purpose:** Build, test, validation execution

```bash
# Run build validation
copilot agents run runner \
  --task "validate build and run all tests"

# Generate test report
copilot agents run runner \
  --task "execute tests and generate JSON report"

# Run specific test suite
copilot agents run runner \
  --task "run integration tests only"
```

#### 4. Security (فحص الأمان)
**Purpose:** Security audits, vulnerability scanning

```bash
# Security audit
copilot agents run security \
  --task "run comprehensive security audit"

# Check dependencies
copilot agents run security \
  --task "scan dependencies for vulnerabilities"

# Validate configurations
copilot agents run security \
  --task "validate security configurations"
```

### Agent Best Practices

- **Be specific:** Clear task descriptions get better results
- **One task at a time:** Don't combine multiple objectives
- **Review output:** Always check agent reports and recommendations
- **Iterate:** Use agent feedback to refine your approach

---

## 📋 PR Management

### List PRs
```bash
# List all PRs
gh pr list

# List open PRs only
gh pr list --state open

# List by author
gh pr list --author MOTEB1989
gh pr list --author Copilot

# List drafts
gh pr list --draft
```

### Check PR Status
```bash
# Use custom script
./scripts/check-pr-status.sh

# Check specific PR
gh pr view 60
gh pr view 60 --json title,state,mergeable

# Check PR diff
gh pr diff 60
```

### Merge PRs
```bash
# Merge single PR (squash)
gh pr merge 60 --squash

# Merge with message
gh pr merge 60 --squash --subject "Merge: Knowledge API"

# Auto-merge approved PRs
./scripts/merge-approved-prs.sh
```

### Close PRs
```bash
# Close single PR
gh pr close 88 --comment "Closing: Task completed"

# Close all draft PRs
./scripts/close-draft-prs.sh

# Close all PRs (careful!)
./scripts/close-all.sh
```

### Create PR
```bash
# From current branch
gh pr create --title "Your title" --body "Description"

# With labels
gh pr create --title "Fix: Bug" --label bug,priority-high

# As draft
gh pr create --draft --title "WIP: Feature X"
```

---

## 🧪 Testing & Validation

### Run Tests
```bash
# All tests
npm test

# Specific validation
node scripts/validate.js

# With verbose output
NODE_ENV=development npm test
```

### Manual Testing
```bash
# Start server
npm start

# Test health endpoint
curl http://localhost:3000/api/health

# Test agents list
curl http://localhost:3000/api/agents

# Test chat (with GPT key)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId": "legal-agent", "input": "Test question"}'
```

### Build Verification
```bash
# Check build time
time npm run validate

# Verify no errors
npm test 2>&1 | grep -i error

# Check exit code
npm test && echo "PASS" || echo "FAIL"
```

---

## 🔐 Security Operations

### Vulnerability Scanning
```bash
# NPM audit
npm audit

# Fix automatically
npm audit fix

# Force fix (careful!)
npm audit fix --force

# Audit report (JSON)
npm audit --json > reports/npm-audit.json
```

### Secret Scanning
```bash
# Check for secrets (requires gitleaks)
gitleaks detect --source . --verbose

# Scan specific files
gitleaks detect --source . --config .gitleaks.toml

# GitHub Actions (automatic)
# See: .github/workflows/secret-scanning.yml
```

### CodeQL Analysis
```bash
# Run via GitHub Actions
gh workflow run codeql-analysis.yml

# View results
gh workflow view codeql-analysis.yml

# Check latest run
gh run list --workflow=codeql-analysis.yml
```

### Security Best Practices
- ✅ Never commit secrets to code
- ✅ Use environment variables for sensitive data
- ✅ Keep dependencies updated
- ✅ Review security advisories regularly
- ✅ Run `npm audit` before releases

---

## 🚀 Deployment

### Pre-Deployment Checklist
```bash
# 1. Run all tests
npm test

# 2. Check for vulnerabilities
npm audit

# 3. Verify environment variables
cat .env.example  # Ensure all vars are set

# 4. Build verification
npm start
# Check endpoints manually

# 5. Review recent changes
git log --oneline -10
```

### Render.com Deployment
```bash
# Automatic on push to main
git push origin main

# Check render.yaml configuration
cat render.yaml

# Manual trigger (via Render dashboard)
# Go to: https://dashboard.render.com
```

### GitHub Pages Deployment
```bash
# Automatic via pages.yml workflow
# On push to main, docs/ is deployed

# Manual verification
# Visit: https://www.lexdo.uk

# DNS setup
./scripts/setup_github_pages_verification.sh
```

### Environment Variables
```bash
# Required for production
export NODE_ENV=production
export PORT=3000
export OPENAI_BSU_KEY=your_key_here
export ADMIN_TOKEN=strong-random-token-here

# Optional
export CORS_ORIGINS=https://lexdo.uk,https://www.lexdo.uk
export RATE_LIMIT_MAX=100
export LOG_LEVEL=info
```

---

## 🔧 Troubleshooting

### Server Won't Start
```bash
# Check port availability
lsof -i :3000
netstat -an | grep 3000

# Try different port
PORT=3001 npm start

# Check logs
NODE_ENV=development npm start | pino-pretty
```

### Tests Failing
```bash
# Clean install
rm -rf node_modules package-lock.json
npm ci

# Verify data files
ls -la data/agents/
cat data/agents/index.json

# Check Node version
node --version  # Should be 22+
```

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules
npm ci

# Update npm itself
npm install -g npm@latest
```

### Git Issues
```bash
# Reset local changes
git checkout -- .

# Clean untracked files
git clean -fd

# Reset to remote
git fetch origin
git reset --hard origin/main
```

### Agent Issues
```bash
# Verify agent files exist
ls -la .github/agents/

# Check agent syntax
cat .github/agents/bsu-autonomous-architect.agent.md

# Test agent manually
copilot agents run runner --task "test task"
```

---

## 📊 Monitoring & Logs

### Check Application Logs
```bash
# Development (pretty print)
npm run dev

# Production (JSON)
npm start

# Save logs to file
npm start > logs/app.log 2>&1
```

### Check Workflow Logs
```bash
# List recent runs
gh run list

# View specific run
gh run view 1234567890

# View logs
gh run view 1234567890 --log
```

### Generate Reports
```bash
# Create custom report
node scripts/generate-report.js

# View existing reports
ls -la reports/
cat reports/TASK-COMPLETION-SUMMARY.md
```

---

## 🆘 Quick Help

### Getting Help
```bash
# NPM scripts
npm run  # Lists all available scripts

# GitHub CLI
gh help
gh pr help
gh workflow help

# Agent help
copilot agents --help
copilot agents run --help
```

### Useful Links
- **Repository:** https://github.com/LexBANK/BSM
- **Documentation:** docs/
- **Reports:** reports/
- **GitHub Pages:** https://www.lexdo.uk

### Common Errors & Solutions

**Error: Cannot find module 'yaml'**
```bash
Solution: npm ci
```

**Error: Port 3000 already in use**
```bash
Solution: PORT=3001 npm start
```

**Error: EACCES permission denied**
```bash
Solution: sudo chown -R $USER:$USER .
```

**Error: Git push rejected**
```bash
Solution: git pull --rebase origin main
```

---

## 💡 Tips & Tricks

### Speed Up Development
```bash
# Use nodemon for auto-reload
npm run dev  # Already configured

# Skip tests temporarily (development only)
npm start --ignore-scripts

# Use npm shortcuts
npm t  # Same as npm test
npm start  # Same as npm run start
```

### Efficient Git Workflow
```bash
# Quick status check
git status -s

# Commit and push in one line
git commit -am "message" && git push

# Switch branches quickly
git checkout -  # Go to previous branch
```

### Agent Workflow
```bash
# Chain agent calls
copilot agents run runner --task "validate" && \
copilot agents run security --task "audit"

# Save agent output
copilot agents run architect --task "analyze" > reports/analysis.txt
```

---

## 📚 Additional Resources

### Documentation Files
- **README.md** - Main documentation
- **CLAUDE.md** - Project overview
- **docs/ARCHITECTURE.md** - Architecture guide
- **reports/READINESS-REPORT.md** - Readiness assessment

### Scripts Directory
- **scripts/validate.js** - Data validation
- **scripts/close-*.sh** - PR/Issue management
- **scripts/merge-*.sh** - Auto-merge tools

### Configuration Files
- **.env.example** - Environment template
- **render.yaml** - Render.com config
- **.gitleaks.toml** - Secret scanning rules
- **package.json** - Dependencies & scripts

---

## ✅ Quick Checklist

### Before Starting Work
- [ ] Pull latest changes: `git pull origin main`
- [ ] Install dependencies: `npm ci`
- [ ] Run tests: `npm test`
- [ ] Check environment: `.env` configured

### Before Committing
- [ ] Run tests: `npm test`
- [ ] Check formatting: Code looks good
- [ ] Review changes: `git diff`
- [ ] Write clear commit message

### Before Merging PR
- [ ] All tests passing
- [ ] No merge conflicts
- [ ] Code reviewed
- [ ] Documentation updated

### Before Deploying
- [ ] All tests passing
- [ ] Security audit clean
- [ ] Environment variables set
- [ ] Backup created (if needed)

---

**Created:** 2026-02-08  
**By:** BSU Autonomous Architect  
**Version:** 1.0  
**Status:** ✅ COMPLETE

*Your quick reference for BSU Platform operations* 🚀
