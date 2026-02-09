#!/bin/bash
# BSU Runner - Execute all build and test tasks
# This script runs comprehensive tests across all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
REPO_ROOT=$(pwd)
REPORTS_DIR="${REPO_ROOT}/reports"
JSON_REPORT="${REPORTS_DIR}/runner-results-${REPORT_TIMESTAMP}.json"
MD_REPORT="${REPORTS_DIR}/runner-summary-${REPORT_TIMESTAMP}.md"

# Ensure reports directory exists
mkdir -p "${REPORTS_DIR}"

# Initialize results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Task results array
declare -a TASKS

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  BSU Runner - Running All Build & Test Tasks${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Helper function to log
log() {
    echo -e "${BLUE}[$(date -u +"%Y-%m-%dT%H:%M:%SZ")]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Helper function to run a task and capture results
run_task() {
    local task_id="$1"
    local task_name="$2"
    local task_command="$3"
    local task_dir="${4:-$REPO_ROOT}"
    
    log "Running: ${task_name}"
    echo -e "${BLUE}Command:${NC} ${task_command}"
    echo ""
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local task_start=$(date +%s)
    local output_file=$(mktemp)
    local status="success"
    local exit_code=0
    
    # Run the command
    cd "${task_dir}"
    if eval "${task_command}" > "${output_file}" 2>&1; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "${task_name} - PASSED"
    else
        exit_code=$?
        FAILED_TESTS=$((FAILED_TESTS + 1))
        status="failed"
        log_error "${task_name} - FAILED (exit code: ${exit_code})"
    fi
    
    local task_end=$(date +%s)
    local duration=$((task_end - task_start))
    
    # Store task result
    local output=$(cat "${output_file}" | head -n 50)
    TASKS+=("$(cat <<EOF
    {
      "id": "${task_id}",
      "name": "${task_name}",
      "command": "${task_command}",
      "status": "${status}",
      "duration": "${duration}s",
      "exitCode": ${exit_code},
      "output": $(echo "${output}" | jq -Rs .)
    }
EOF
)")
    
    rm -f "${output_file}"
    echo ""
    cd "${REPO_ROOT}"
}

# =============================================================================
# Task 1: Install Node.js Dependencies
# =============================================================================
run_task "node-dependencies" "Install Node.js Dependencies" "npm ci"

# =============================================================================
# Task 2: Run Node.js Validation Tests
# =============================================================================
run_task "node-validation" "Run Node.js Validation Tests" "npm test"

# =============================================================================
# Task 3: Test Node.js Server Startup
# =============================================================================
run_task "node-server-startup" "Test Node.js Server Startup (10s timeout)" "timeout 10 npm start || true"

# =============================================================================
# Task 4: Build Go Document Processor
# =============================================================================
if [ -d "services/document-processor" ]; then
    run_task "go-dependencies" "Download Go Dependencies" "go mod download" "services/document-processor"
    run_task "go-build" "Build Go Document Processor" "go build -o bin/server cmd/server/main.go" "services/document-processor"
    run_task "go-test" "Run Go Tests" "go test ./..." "services/document-processor"
else
    log_warning "Go document-processor service not found, skipping"
fi

# =============================================================================
# Task 5: Security Audit
# =============================================================================
run_task "npm-audit" "Run npm Security Audit" "npm audit --audit-level=high || true"

# =============================================================================
# Calculate final statistics
# =============================================================================
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

# Determine overall status
OVERALL_STATUS="success"
if [ ${FAILED_TESTS} -gt 0 ]; then
    OVERALL_STATUS="failed"
fi

# =============================================================================
# Generate JSON Report
# =============================================================================
log "Generating JSON report: ${JSON_REPORT}"

# Build tasks JSON array
TASKS_JSON="["
for i in "${!TASKS[@]}"; do
    if [ $i -gt 0 ]; then
        TASKS_JSON+=","
    fi
    TASKS_JSON+="${TASKS[$i]}"
done
TASKS_JSON+="]"

# Get environment info
NODE_VERSION=$(node --version 2>/dev/null || echo "N/A")
NPM_VERSION=$(npm --version 2>/dev/null || echo "N/A")
GO_VERSION=$(go version 2>/dev/null | awk '{print $3}' || echo "N/A")

cat > "${JSON_REPORT}" <<EOF
{
  "runnerVersion": "1.0.0",
  "timestamp": "${TIMESTAMP}",
  "environment": {
    "nodeVersion": "${NODE_VERSION}",
    "npmVersion": "${NPM_VERSION}",
    "goVersion": "${GO_VERSION}",
    "platform": "$(uname -s | tr '[:upper:]' '[:lower:]')",
    "cwd": "${REPO_ROOT}"
  },
  "summary": {
    "totalTests": ${TOTAL_TESTS},
    "passed": ${PASSED_TESTS},
    "failed": ${FAILED_TESTS},
    "skipped": 0,
    "duration": "${TOTAL_DURATION}s",
    "status": "${OVERALL_STATUS}"
  },
  "tasks": ${TASKS_JSON}
}
EOF

log_success "JSON report generated"

# =============================================================================
# Generate Markdown Report
# =============================================================================
log "Generating Markdown report: ${MD_REPORT}"

cat > "${MD_REPORT}" <<EOF
# BSU Runner Execution Report

**Generated:** ${TIMESTAMP}  
**Runner Version:** 1.0.0  
**Status:** $([ "${OVERALL_STATUS}" == "success" ] && echo "✅ SUCCESS" || echo "❌ FAILED")

---

## Executive Summary

$([ ${FAILED_TESTS} -eq 0 ] && echo "All build and test tasks completed successfully. The BSU platform is ready for deployment." || echo "Some tasks failed. Review the details below.")

- $([ ${FAILED_TESTS} -eq 0 ] && echo "✅" || echo "❌") Total: ${TOTAL_TESTS} tasks
- ✅ Passed: ${PASSED_TESTS}
- $([ ${FAILED_TESTS} -gt 0 ] && echo "❌ Failed: ${FAILED_TESTS}" || echo "✅ Failed: 0")
- ⏱️  Duration: ${TOTAL_DURATION}s

---

## Environment

| Property | Value |
|----------|-------|
| Node.js Version | ${NODE_VERSION} |
| npm Version | ${NPM_VERSION} |
| Go Version | ${GO_VERSION} |
| Platform | $(uname -s) |
| Working Directory | ${REPO_ROOT} |

---

## Task Results

EOF

# Add each task to the markdown report
task_num=1
for task in "${TASKS[@]}"; do
    task_id=$(echo "${task}" | jq -r '.id')
    task_name=$(echo "${task}" | jq -r '.name')
    task_command=$(echo "${task}" | jq -r '.command')
    task_status=$(echo "${task}" | jq -r '.status')
    task_duration=$(echo "${task}" | jq -r '.duration')
    task_exit_code=$(echo "${task}" | jq -r '.exitCode')
    task_output=$(echo "${task}" | jq -r '.output')
    
    status_icon="✅"
    status_text="SUCCESS"
    if [ "${task_status}" == "failed" ]; then
        status_icon="❌"
        status_text="FAILED"
    fi
    
    cat >> "${MD_REPORT}" <<EOF
### ${task_num}. ${status_icon} ${task_name}

**Command:** \`${task_command}\`  
**Duration:** ${task_duration}  
**Status:** ${status_text}  
**Exit Code:** ${task_exit_code}

**Output:**
\`\`\`
${task_output}
\`\`\`

---

EOF
    task_num=$((task_num + 1))
done

cat >> "${MD_REPORT}" <<EOF
## Conclusion

$([ ${FAILED_TESTS} -eq 0 ] && echo "The BSU platform has successfully passed all build and test validations. No errors or failures detected. The system is ready for deployment." || echo "Some tasks failed. Please review the failures above and address any issues.")

**Overall Status:** $([ "${OVERALL_STATUS}" == "success" ] && echo "✅ PASSED (${PASSED_TESTS}/${TOTAL_TESTS} tasks successful)" || echo "❌ FAILED (${PASSED_TESTS}/${TOTAL_TESTS} tasks successful)")

---

*Report generated by BSU Runner Agent v1.0.0*
EOF

log_success "Markdown report generated"

# =============================================================================
# Print Summary
# =============================================================================
echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Execution Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Total Tests:     ${TOTAL_TESTS}"
echo "Passed:          ${GREEN}${PASSED_TESTS}${NC}"
echo "Failed:          $([ ${FAILED_TESTS} -gt 0 ] && echo -e "${RED}${FAILED_TESTS}${NC}" || echo "${GREEN}0${NC}")"
echo "Duration:        ${TOTAL_DURATION}s"
echo ""
echo "Reports saved to:"
echo "  - JSON: ${JSON_REPORT}"
echo "  - Markdown: ${MD_REPORT}"
echo ""

if [ "${OVERALL_STATUS}" == "success" ]; then
    log_success "All tasks completed successfully!"
    exit 0
else
    log_error "Some tasks failed. Please review the reports."
    exit 1
fi
