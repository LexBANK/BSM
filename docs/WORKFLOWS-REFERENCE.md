# GitHub Workflows Quick Reference

This document provides a quick reference for all GitHub Actions workflows in the BSM repository.

## Workflows Overview

| Workflow | Trigger | Purpose | Required for PR? |
|----------|---------|---------|------------------|
| `pr-checks.yml` | PR to main/develop | Comprehensive PR validation | ✅ Yes |
| `validate.yml` | PR, push to main | Quick data validation | ✅ Yes |
| `codeql-analysis.yml` | PR, push to main | Security code analysis | ✅ Yes |
| `secret-scanning.yml` | PR, push to main/develop, weekly | Multi-layer secret detection | ✅ Yes |
| `pages.yml` | Push to main | Deploy docs to GitHub Pages | ❌ No |
| `publish-reports.yml` | Manual dispatch | Publish agent reports | ❌ No |
| `run-bsm-agents.yml` | Manual dispatch | Run BSM agents | ❌ No |
| `weekly-agents.yml` | Weekly schedule | Periodic agent runs | ❌ No |

## Workflow Details

### PR Checks (`pr-checks.yml`)
**Purpose**: Comprehensive validation of all Pull Requests

**Jobs**:
1. **Code Quality** - Validates code structure, runs ESLint/Prettier
2. **Tests** - Runs tests on Node 20 and 22
3. **Security** - CodeQL, npm audit, Trivy scanning
4. **Build** - Docker build and health check verification
5. **BSM Agents** - Runs custom agents (Architect, Runner, Security, Orchestrator)
6. **Summary** - Generates PR check summary

**Triggers**:
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened
- Pull request marked ready for review

**Required**: ✅ Must pass for PR approval

---

### Validate (`validate.yml`)
**Purpose**: Quick validation of data structure integrity

**Jobs**:
- Install dependencies
- Run `npm run validate`

**Triggers**:
- Pull request to any branch
- Push to main branch

**Required**: ✅ Must pass for PR approval

---

### CodeQL Analysis (`codeql-analysis.yml`)
**Purpose**: Static code security analysis

**Jobs**:
- Initialize CodeQL for JavaScript
- Perform security analysis
- Upload findings to GitHub Security

**Triggers**:
- Pull request to main
- Push to main

**Required**: ✅ Must pass for PR approval

---

### Secret Scanning (`secret-scanning.yml`)
**Purpose**: Detect leaked secrets and credentials

**Jobs**:
1. **Gitleaks** - Fast pattern-based secret scanning
2. **TruffleHog** - Deep secret scanning with verification
3. **Git Secrets** - AWS and custom pattern scanning
4. **Summary** - Combined results report

**Triggers**:
- Pull request to main/develop
- Push to main/develop
- Weekly on Sundays at midnight
- Manual trigger

**Required**: ✅ Must pass for PR approval

---

### GitHub Pages (`pages.yml`)
**Purpose**: Deploy documentation site

**Jobs**:
- Deploy `docs/` directory to GitHub Pages

**Triggers**:
- Push to main branch

**Required**: ❌ Informational only

---

### Publish Reports (`publish-reports.yml`)
**Purpose**: Publish agent reports and artifacts

**Jobs**:
- Build reports index
- Upload artifacts
- Deploy to GitHub Pages

**Triggers**:
- Manual workflow dispatch

**Required**: ❌ Manual operation

---

### Run BSM Agents (`run-bsm-agents.yml`)
**Purpose**: Execute BSM agent pipeline

**Jobs**:
- Checkout code
- Install tools (jq, snyk)
- Run agents pipeline
- Upload reports and logs

**Triggers**:
- Manual workflow dispatch

**Required**: ❌ Manual operation

---

### Weekly Agents (`weekly-agents.yml`)
**Purpose**: Periodic automated agent runs

**Jobs**:
- Run BSM agents pipeline
- Generate reports
- Upload artifacts

**Triggers**:
- Weekly schedule (configurable)

**Required**: ❌ Scheduled operation

---

## Viewing Workflow Results

### In Pull Requests
1. Navigate to the PR
2. Click the "Checks" tab
3. View detailed logs for each job
4. Check the summary at the bottom of the PR

### In Actions Tab
1. Go to repository → Actions
2. Select a workflow from the left sidebar
3. Click on a specific run to view details
4. Download artifacts if available

## Manual Workflow Execution

Some workflows can be triggered manually:

1. Go to repository → Actions
2. Select the workflow from the left sidebar
3. Click "Run workflow" button
4. Select branch and provide any required inputs
5. Click "Run workflow" to start

**Manually triggerable workflows**:
- `secret-scanning.yml`
- `run-bsm-agents.yml`
- `publish-reports.yml`

## Workflow Artifacts

Some workflows produce artifacts that can be downloaded:

| Workflow | Artifact | Retention |
|----------|----------|-----------|
| `pr-checks.yml` | agents-reports-{sha} | 30 days |
| `run-bsm-agents.yml` | agents-report-json | 90 days |
| `run-bsm-agents.yml` | agents-report-md | 90 days |
| `run-bsm-agents.yml` | agents-run-log | 30 days |
| `weekly-agents.yml` | weekly-agents-report | 90 days |

## Troubleshooting

### Workflow Fails on PR
1. Check the "Checks" tab in the PR
2. Click on the failed job to view logs
3. Identify the error message
4. Fix the issue locally
5. Push the fix to the PR branch

### Common Issues

**Code Quality Fails**:
- Run `npm run validate` locally
- Fix validation errors
- Commit and push

**Tests Fail**:
- Run `npm test` locally
- Fix failing tests
- Verify all tests pass before pushing

**Security Scan Fails**:
- Review security findings
- Never commit secrets
- Rotate exposed credentials immediately
- Update `.gitleaks.toml` for false positives

**Build Fails**:
- Test Docker build locally: `docker build -t bsm-test .`
- Fix build issues
- Verify health endpoint works

## Best Practices

1. **Always run locally first**: Test `npm run validate` and `npm test` before pushing
2. **Review workflow logs**: Check logs even when workflows pass
3. **Keep workflows updated**: Regularly update action versions
4. **Monitor security alerts**: Address security findings promptly
5. **Use manual workflows**: Run manual workflows for testing before PRs

## Getting Help

If you encounter workflow issues:

1. Check workflow logs for detailed error messages
2. Review this documentation
3. Check the [PR Checking Process](PR-CHECKING-PROCESS.md) guide
4. Ask in PR comments
5. Contact @LexBANK/platform-team

## Related Documentation

- [PR Checking Process](PR-CHECKING-PROCESS.md) - Detailed PR check documentation
- [CICD-RECOMMENDATIONS.md](CICD-RECOMMENDATIONS.md) - CI/CD enhancement strategies
- [SECURITY-DEPLOYMENT.md](SECURITY-DEPLOYMENT.md) - Security best practices
