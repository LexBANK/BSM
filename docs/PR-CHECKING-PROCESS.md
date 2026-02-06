# Pull Request Checking Process

This document describes the automated checks that run on all Pull Requests (PRs) in the BSM repository.

## Overview

Every PR to the `main` or `develop` branch triggers a comprehensive set of automated checks to ensure code quality, security, and functionality.

## Automated Checks

### 1. Code Quality Check
**Workflow:** `pr-checks.yml` - Job: `quality`

Validates:
- Code structure validation using `npm run validate`
- ESLint checks (if configured)
- Prettier formatting checks (if configured)
- Data structure integrity

**Requirements:** Must pass for PR to be mergeable

### 2. Tests
**Workflow:** `pr-checks.yml` - Job: `test`

Runs on multiple Node.js versions (20, 22):
- Unit tests
- Integration tests
- Coverage reports (uploaded to Codecov for Node 22)

**Requirements:** Must pass for PR to be mergeable

### 3. Security Scanning
**Workflow:** Multiple workflows

#### CodeQL Analysis (`codeql-analysis.yml`)
- Static code analysis for JavaScript
- Identifies potential security vulnerabilities
- Generates security alerts

#### Secret Scanning (`secret-scanning.yml`)
- **Gitleaks**: Fast secret scanning with pattern matching
- **TruffleHog**: Deep secret scanning with verification
- **Git Secrets**: AWS and custom pattern scanning

#### npm Audit (`pr-checks.yml`)
- Checks for known vulnerabilities in dependencies
- Audit level: moderate

#### Trivy Scanner (`pr-checks.yml`)
- Filesystem vulnerability scanning
- SARIF report generation

**Requirements:** Must pass for PR to be mergeable

### 4. Build & Verification
**Workflow:** `pr-checks.yml` - Job: `build`

Validates:
- Docker image builds successfully (if Dockerfile exists)
- Health check endpoint responds correctly
- Application starts without errors

**Requirements:** Must pass for PR to be mergeable

### 5. BSM Custom Agents
**Workflow:** `pr-checks.yml` - Job: `agents`

Executes BSM's custom agent pipeline:
- **Architect Agent**: Analyzes code structure and suggests improvements
- **Runner Agent**: Validates build and test processes
- **Security Agent**: Reviews security configurations
- **Orchestrator**: Compiles all agent results

Generates:
- JSON reports with detailed findings
- Markdown summaries for easy reading
- Uploaded as artifacts for review

**Requirements:** Informational - provides recommendations but doesn't block merge

### 6. Validation Check
**Workflow:** `validate.yml`

Simple validation that runs on every PR:
- Installs dependencies
- Runs `npm run validate`

**Requirements:** Must pass for PR to be mergeable

## PR Checklist

Before submitting a PR, ensure:

- [ ] All code follows the project's style guide
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated as needed
- [ ] All tests pass locally
- [ ] No hardcoded secrets or credentials
- [ ] Input validation implemented
- [ ] Security considerations addressed

## Check Status

You can view the status of all checks in the PR:

1. **Checks Tab**: See detailed logs for each job
2. **Conversation Tab**: Summary of check results
3. **Files Changed Tab**: View code changes being checked

## Required Reviews

Based on CODEOWNERS configuration:

- **Workflow changes** (`.github/workflows/`): Require @LexBANK/platform-team review
- **Scripts** (`scripts/`): Require @LexBANK/platform-team review
- **Security configs** (`.gitleaks.toml`): Require @LexBANK/platform-team review
- **Published reports** (`docs/reports/`): Require @LexBANK/platform-team review

## Handling Check Failures

### Code Quality Failures
1. Review the validation errors in the job log
2. Fix code structure or data validation issues
3. Run `npm run validate` locally to verify
4. Push fixes to your PR branch

### Test Failures
1. Check the test job logs for failed tests
2. Run tests locally: `npm test`
3. Fix the failing tests or code
4. Verify locally before pushing

### Security Failures
1. **Never commit secrets** - rotate any exposed credentials immediately
2. Review security scan results
3. Fix vulnerabilities or update dependencies
4. For false positives, update `.gitleaks.toml` with proper justification

### Build Failures
1. Review build logs
2. Test Docker build locally: `docker build -t bsm-test .`
3. Fix build issues
4. Verify health check endpoint works

## Manual Testing

While automated checks are comprehensive, manual testing is still important:

1. Test the functionality locally
2. Verify edge cases
3. Check UI/UX changes visually
4. Test integration with external services

## Getting Help

If you encounter issues with PR checks:

1. Check the job logs for detailed error messages
2. Review this documentation
3. Ask in the PR comments for help
4. Contact @LexBANK/platform-team for workflow issues

## Continuous Improvement

The PR checking process is continuously improved. Suggestions for new checks or improvements are welcome via:

- Opening an issue
- Discussing in PR comments
- Contributing workflow improvements
