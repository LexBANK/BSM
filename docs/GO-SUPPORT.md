# BSM Go Language Support

## Overview

The BSM platform now includes comprehensive support for Go programming language through the Runner agent. This enables building, testing, and deploying Go applications within the BSM ecosystem.

## Features

- **Go Build**: Compile Go applications with `go build`
- **Go Test**: Run unit tests with `go test -v`
- **Go Run**: Execute Go programs directly
- **Automated Reporting**: Generate JSON and Markdown reports for all operations
- **Error Collection**: Capture and analyze build and test failures
- **Integration**: Works seamlessly with BSM's agent orchestration system

## Quick Start

### Prerequisites

- Go 1.24+ installed
- BSM platform dependencies installed (`npm install`)

### Running the Go Example

```bash
# Run the complete build and test pipeline
./scripts/run-go-example.sh

# Specify custom output directory
./scripts/run-go-example.sh reports/custom
```

### Manual Commands

Navigate to the Go example:
```bash
cd examples/go-example
```

Build the application:
```bash
go build -o app main.go
```

Run the application:
```bash
./app
```

Run tests:
```bash
go test -v
```

## Example Project Structure

```
examples/go-example/
├── go.mod          # Go module definition
├── main.go         # Main application code
├── main_test.go    # Unit tests
└── README.md       # Documentation
```

## Runner Script

The `scripts/run-go-example.sh` script provides automated build, test, and reporting:

### Script Flow

1. **Version Check**: Verify Go installation
2. **Build**: Compile the Go application
3. **Run**: Execute the compiled binary
4. **Test**: Run all unit tests with verbose output
5. **Report**: Generate JSON and Markdown reports

### Output Files

The runner generates two types of reports:

- **JSON Report**: `reports/go-result-{timestamp}.json` - Machine-readable results
- **Markdown Report**: `reports/go-report-{timestamp}.md` - Human-readable summary

### Sample Output

```
=== Checking Go Version ===
go version go1.24.12 linux/amd64

=== Building Go Application ===
✓ Build successful

=== Running Go Application ===
Hello from BSM Go Support!
BSM Platform now supports Go builds and tests

=== Running Go Tests ===
=== RUN   TestAdd
--- PASS: TestAdd (0.00s)
=== RUN   TestAddNegative
--- PASS: TestAddNegative (0.00s)
PASS

✓ All checks passed
```

## Integration with BSM Runner Agent

The Go support integrates with the BSM Runner agent capabilities:

- **Isolated Execution**: Runs in dedicated environments
- **Log Collection**: Captures all stdout/stderr
- **Error Analysis**: Parses Go build and test errors
- **Status Reporting**: Provides clear success/failure indicators
- **CI/CD Ready**: Can be integrated into GitHub Actions workflows

## GitHub Actions Integration

Create a workflow file `.github/workflows/go-build.yml`:

```yaml
name: Go Build and Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  go-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.24'
      
      - name: Run BSM Go Runner
        run: ./scripts/run-go-example.sh
      
      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: go-reports
          path: reports/go-*
```

## Adding Your Own Go Projects

To add Go support to your own projects:

1. Create a `go.mod` file in your project root
2. Organize your code with proper package structure
3. Add unit tests in `*_test.go` files
4. Create a runner script based on `scripts/run-go-example.sh`
5. Update the BSM agent configuration if needed

## Testing

The example includes comprehensive tests:

```go
func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5
    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}
```

Run tests with:
```bash
cd examples/go-example
go test -v
```

## Benefits

✅ **Multi-Language Support**: BSM now supports Node.js, Python, and Go  
✅ **Automated Testing**: Consistent test execution across languages  
✅ **Comprehensive Reporting**: Unified report format for all languages  
✅ **CI/CD Integration**: Ready for GitHub Actions and other CI platforms  
✅ **Error Tracking**: Detailed error collection and analysis  

## Troubleshooting

### Go Not Found
If you see "go: command not found":
```bash
# Verify Go installation
which go
go version
```

### Build Failures
Check the generated report in `reports/go-report-*.md` for detailed error messages.

### Test Failures
Test output is included in the report. Review the specific test that failed and its error message.

## Next Steps

- Add more complex Go examples (web servers, APIs, microservices)
- Integrate with Docker for containerized builds
- Add code coverage reporting
- Implement benchmarking support
- Create Go-specific agent configurations

## Resources

- [Go Documentation](https://golang.org/doc/)
- [Go Testing Package](https://golang.org/pkg/testing/)
- [BSM Platform README](../README.md)
- [Runner Agent Definition](../.github/agents/runner.agent.md)

---

*Last Updated: 2026-02-06*
*BSM Platform - LexBANK*
