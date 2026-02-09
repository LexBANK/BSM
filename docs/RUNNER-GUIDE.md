# BSU Runner Guide

## Overview

The BSU Runner is a comprehensive build and test execution system that validates all components of the BSU platform, including both Node.js and Go services.

## Quick Start

```bash
# Run all build and test tasks
npm run run-all

# Or execute the script directly
./scripts/run-all.sh
```

## What Gets Tested

The runner executes the following tasks in sequence:

### 1. Node.js Dependencies (npm ci)
- Clean installation of all Node.js dependencies
- Verifies package-lock.json integrity
- Checks for dependency vulnerabilities

### 2. Node.js Validation Tests
- Validates agent YAML configurations
- Checks data structure integrity
- Ensures all agent files exist and are valid

### 3. Node.js Server Startup Test
- Tests server initialization
- Verifies port binding (default: 3000)
- Confirms health check endpoint availability

### 4. Go Service Dependencies
- Downloads Go module dependencies
- Verifies go.mod and go.sum integrity

### 5. Go Document Processor Build
- Compiles the Go document-processor service
- Generates optimized binary in `services/document-processor/bin/`
- Validates all Go source code compiles successfully

### 6. Go Tests
- Runs all Go test suites
- Validates package structure
- Reports test coverage

### 7. Security Audit
- Runs npm security audit
- Reports high-severity vulnerabilities
- Ensures no critical security issues

## Output and Reports

The runner generates two types of reports in the `reports/` directory:

### JSON Report
**Location:** `reports/runner-results-YYYY-MM-DD_HH-MM-SS.json`

Structured data including:
- Environment information (Node.js, npm, Go versions)
- Task execution details
- Success/failure status
- Execution duration
- Command output

### Markdown Report
**Location:** `reports/runner-summary-YYYY-MM-DD_HH-MM-SS.md`

Human-readable report with:
- Executive summary
- Environment details
- Task-by-task results
- Conclusion and recommendations

## Example Usage

### Basic Execution
```bash
npm run run-all
```

**Expected Output:**
```
================================================
  BSU Runner - Running All Build & Test Tasks
================================================

[2026-02-09T22:44:53Z] Running: Install Node.js Dependencies
Command: npm ci

✅ Install Node.js Dependencies - PASSED
...

================================================
  Execution Summary
================================================

Total Tests:     7
Passed:          7
Failed:          0
Duration:        11s
```

### CI/CD Integration

The runner can be integrated into GitHub Actions workflows:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - name: Run comprehensive tests
        run: npm run run-all
      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: runner-reports
          path: reports/runner-*.{json,md}
```

## Exit Codes

- **0**: All tasks passed successfully
- **1**: One or more tasks failed

## Troubleshooting

### Go Build Failures

If the Go build fails with missing dependencies:
```bash
cd services/document-processor
go mod tidy
go mod download
```

### Node.js Test Failures

If validation tests fail:
```bash
# Check agent configuration
node scripts/validate.js

# Review agent YAML files
cat data/agents/index.json
```

### Server Startup Timeout

The server startup test has a 10-second timeout. If your server takes longer to start:
- Check for slow dependencies
- Review server initialization logs
- Verify port availability

## Advanced Usage

### Run Individual Components

```bash
# Node.js only
npm ci
npm test
npm start

# Go only
cd services/document-processor
go build -o bin/server cmd/server/main.go
go test ./...
```

### Custom Environment

Set environment variables before running:
```bash
PORT=8080 LOG_LEVEL=debug ./scripts/run-all.sh
```

### Parallel Execution

For faster execution in CI/CD, consider running Node.js and Go tests in parallel:

```yaml
jobs:
  test-node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm test
  
  test-go:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - run: |
          cd services/document-processor
          go build ./...
          go test ./...
```

## Report Retention

By default, runner reports are kept in the `reports/` directory. The `.gitignore` is configured to:
- Ignore most reports
- Keep security reports (`SECURITY-*.md`)
- Keep runner reports (`runner-*.{json,md}`)

## Performance Benchmarks

Typical execution times on standard hardware:

| Task | Duration |
|------|----------|
| Node.js Dependencies | 1-2s |
| Validation Tests | <1s |
| Server Startup | 10s |
| Go Dependencies | <1s |
| Go Build | <1s |
| Go Tests | <1s |
| Security Audit | <1s |
| **Total** | **~11-15s** |

## Requirements

- **Node.js**: 22+ (verified with v24.13.0)
- **npm**: 11+ (verified with 11.6.2)
- **Go**: 1.22+ (verified with go1.24.12)
- **OS**: Linux, macOS, or WSL on Windows
- **Bash**: Required for script execution

## Related Documentation

- [README.md](../README.md) - Main project documentation
- [Go Integration Architecture](GO-INTEGRATION-ARCHITECTURE.md) - Hybrid Node.js/Go architecture
- [CI/CD Recommendations](CICD-RECOMMENDATIONS.md) - Pipeline best practices
- [Security & Deployment](SECURITY-DEPLOYMENT.md) - Security guidelines

---

*BSU Runner v1.0.0 - Part of the LexBANK BSU Platform*
