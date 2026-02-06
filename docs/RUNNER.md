# BSM Runner

Agent مسؤول عن تنفيذ اختبارات البناء، محاكاة النشر، وتحليل الـ logs.

## Purpose

تشغيل أوامر البناء والاختبار في بيئة معزولة، جمع الأخطاء، وإرجاع ملخص.

## Capabilities

- تشغيل npm/yarn حسب التكوين
- تنفيذ أوامر validation, build, وtest
- جمع logs وتحليل stack traces
- إخراج نتائج بصيغة JSON وملخص Markdown
- اكتشاف تلقائي لـ package manager (npm أو yarn)
- معالجة الأخطاء والتحذيرات بذكاء
- دعم timeout قابل للتخصيص

## Constraints

- لا يدفع تغييرات تلقائياً
- يطلب إذن قبل أي كتابة أو فتح PR
- يعمل في بيئة معزولة

## Integration

### Local Execution

```bash
# Basic usage
npm run runner

# With JSON output
npm run runner -- --output runner-results.json

# With both JSON and Markdown output
npm run runner -- --output results.json --markdown summary.md

# Skip specific steps
npm run runner -- --skip-build --skip-tests
npm run runner -- --skip-validation

# Custom timeout (in milliseconds)
npm run runner -- --timeout 300000

# Show help
npm run runner -- --help
```

### GitHub Actions Integration

The runner can be integrated into GitHub Actions workflows:

```yaml
name: Run BSM Runner

on:
  push:
    branches: [main]
  pull_request:

jobs:
  runner:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Run BSM Runner
        run: npm run runner -- --output runner-results.json --markdown runner-summary.md

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: runner-results
          path: |
            runner-results.json
            runner-summary.md
```

### Direct Script Usage

```bash
# Using node directly
node scripts/runner.js --target local --output results.json

# CI environment
node scripts/runner.js --target ci --output results.json --markdown summary.md
```

## Output Formats

### JSON Output

The JSON output contains:

```json
{
  "timestamp": "2026-02-06T04:12:10.149Z",
  "summary": {
    "total": 3,
    "passed": 1,
    "failed": 0,
    "skipped": 2
  },
  "results": {
    "validation": {
      "success": true,
      "command": "npm run validate",
      "duration": 220,
      "stdout": "...",
      "stderr": "",
      "logs": {
        "errors": [],
        "warnings": [],
        "stackTrace": []
      },
      "exitCode": 0
    },
    "build": { ... },
    "tests": { ... }
  }
}
```

### Markdown Output

The Markdown output provides a human-readable summary:

```markdown
# BSM Runner Report

**Generated:** 2026-02-06T04:12:10.149Z

## Summary

- ✅ Passed: 1
- ❌ Failed: 0
- ⊘ Skipped: 2

## validation

**Status:** ✅ Passed
**Duration:** 220ms
**Command:** `npm run validate`
**Exit Code:** 0

## build

**Status:** ⊘ Skipped
**Reason:** No build script defined
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--target <local\|ci>` | Target environment | `local` |
| `--output <path>` | JSON output file path | None |
| `--markdown <path>` | Markdown output file path | None |
| `--skip-build` | Skip build step | `false` |
| `--skip-tests` | Skip test step | `false` |
| `--skip-validation` | Skip validation step | `false` |
| `--timeout <ms>` | Command timeout in milliseconds | `120000` |
| `--help, -h` | Show help message | - |

## Exit Codes

- `0`: All tests passed or skipped
- `1`: One or more tests failed or execution error

## Error Handling

The runner automatically:

1. Captures stdout and stderr from all commands
2. Parses error messages and warnings
3. Extracts stack traces from failures
4. Categorizes issues by severity
5. Provides detailed error reports in both JSON and Markdown formats

## Implementation Details

### Module: `src/runners/buildTestRunner.js`

Main functions:

- `runBuild(config)` - Execute build command
- `runTests(config)` - Execute test command
- `runValidation(config)` - Execute validation command
- `runAll(config)` - Execute all steps
- `generateJSON(results)` - Generate JSON output
- `generateMarkdown(results)` - Generate Markdown summary

### CLI Script: `scripts/runner.js`

Command-line interface for the runner with argument parsing and output formatting.

## Examples

### Example 1: Basic Run

```bash
npm run runner
```

Output:
```
🚀 Starting BSM Runner...
Target: local

============================================================
📊 Runner Summary
============================================================
Total: 3
✅ Passed: 1
❌ Failed: 0
⊘ Skipped: 2
============================================================
✅ VALIDATION: PASSED
⊘ BUILD: SKIPPED
⊘ TESTS: SKIPPED
```

### Example 2: Full Run with Outputs

```bash
npm run runner -- --output reports/runner.json --markdown reports/summary.md
```

### Example 3: CI Pipeline

```bash
node scripts/runner.js --target ci --output results.json
if [ $? -eq 0 ]; then
  echo "All checks passed"
else
  echo "Some checks failed"
  exit 1
fi
```

## Troubleshooting

### Command Timeout

If commands take longer than expected, increase the timeout:

```bash
npm run runner -- --timeout 300000
```

### Missing Scripts

The runner will skip any step that doesn't have a corresponding script in package.json:

- No `build` script → Build skipped
- No `test` script → Tests skipped
- No `validate` script → Validation skipped

### Package Manager Detection

The runner automatically detects the package manager:

- If `yarn.lock` exists → uses `yarn`
- If only `package.json` exists → uses `npm`
- If neither exists → skips npm/yarn steps

## Security Considerations

- The runner executes commands with a configurable timeout to prevent hanging
- Buffer size is limited to 10MB to prevent memory exhaustion
- All outputs are sanitized before writing to files
- No automatic commits or PR creation without explicit permission

## Future Enhancements

Potential improvements:

- Docker build support
- Python pytest integration
- Parallel test execution
- Real-time log streaming
- Integration with CI/CD platforms
- Custom command execution
- Email notifications for failures

## Related Files

- `src/runners/buildTestRunner.js` - Main runner implementation
- `scripts/runner.js` - CLI interface
- `.github/agents/runner.agent.md` - Agent definition
- `.github/workflows/agents-run.yml` - GitHub Actions workflow
