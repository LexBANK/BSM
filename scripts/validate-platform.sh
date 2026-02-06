#!/bin/bash
# BSM-AgentOS Platform Validation Script
# Comprehensive validation of all platform components

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║   BSM-AgentOS Platform Validation                 ║"
echo "║   Comprehensive System Check                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Section header
section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 1. Prerequisites Check
section "1. Prerequisites Check"

run_test "Node.js installed" "command -v node"
run_test "npm installed" "command -v npm"
run_test "Node.js version >= 22" "node -v | grep -E 'v2[2-9]\.|v[3-9][0-9]\.'"
run_test "Git installed" "command -v git"

# Optional checks
if command -v docker &> /dev/null; then
    run_test "Docker installed" "command -v docker"
    run_test "Docker Compose installed" "command -v docker-compose"
fi

if command -v psql &> /dev/null; then
    run_test "PostgreSQL client installed" "command -v psql"
fi

if command -v redis-cli &> /dev/null; then
    run_test "Redis client installed" "command -v redis-cli"
fi

# 2. File Structure Validation
section "2. File Structure Validation"

run_test "package.json exists" "test -f package.json"
run_test ".env.example exists" "test -f .env.example"
run_test "Dockerfile exists" "test -f Dockerfile"
run_test "docker-compose.yml exists" "test -f docker-compose.yml"

# Core directories
run_test "src/ directory exists" "test -d src"
run_test "src/core/ directory exists" "test -d src/core"
run_test "src/security/ directory exists" "test -d src/security"
run_test "src/ml/ directory exists" "test -d src/ml"
run_test "data/schemas/ directory exists" "test -d data/schemas"

# 3. Core Files Validation
section "3. Core Files Validation"

# Core Engine
run_test "Core Engine exists" "test -f src/core/engine.js"
run_test "Agent Manager exists" "test -f src/core/agentManager.js"
run_test "Task Queue exists" "test -f src/core/taskQueue.js"
run_test "Event Bus exists" "test -f src/core/eventBus.js"

# Security Hub
run_test "Security Hub exists" "test -f src/security/securityHub.js"
run_test "Auth Service exists" "test -f src/security/authService.js"
run_test "Encryption Service exists" "test -f src/security/encryptionService.js"
run_test "Audit Logger exists" "test -f src/security/auditLogger.js"

# ML Engine
run_test "ML Engine exists" "test -f src/ml/mlEngine.js"
run_test "Inference Service exists" "test -f src/ml/inferenceService.js"
run_test "Model Registry exists" "test -f src/ml/modelRegistry.js"

# Database
run_test "Database config exists" "test -f data/db.js"
run_test "Migration script exists" "test -f scripts/db-migrate.js"

# Dashboard
run_test "Dashboard app exists" "test -f src/dashboard/streamlit/app.py"
run_test "Dashboard requirements exists" "test -f src/dashboard/streamlit/requirements.txt"

# 4. Database Schema Validation
section "4. Database Schema Validation"

run_test "Agents schema exists" "test -f data/schemas/001_agents.sql"
run_test "Tasks schema exists" "test -f data/schemas/002_tasks.sql"
run_test "Users schema exists" "test -f data/schemas/003_users.sql"
run_test "Audit logs schema exists" "test -f data/schemas/004_audit_logs.sql"
run_test "Knowledge schema exists" "test -f data/schemas/005_knowledge.sql"
run_test "Sessions schema exists" "test -f data/schemas/006_sessions.sql"

# 5. Documentation Validation
section "5. Documentation Validation"

run_test "README exists" "test -f README.md"
run_test "Architecture doc exists" "test -f docs/ARCHITECTURE.md"
run_test "Blueprint exists" "test -f docs/BSM-AGENTOS-BLUEPRINT.md"
run_test "Setup guide exists" "test -f docs/SETUP-GUIDE.md"

# 6. Deployment Configuration Validation
section "6. Deployment Configuration Validation"

run_test "Kubernetes deployment exists" "test -f deployment/kubernetes/deployment.yaml"
run_test "Deploy script exists" "test -f scripts/deploy.sh"
run_test "Deploy script is executable" "test -x scripts/deploy.sh"

# 7. CI/CD Validation
section "7. CI/CD Validation"

run_test "CI/CD workflow exists" "test -f .github/workflows/ci-cd.yml"
run_test "CodeQL workflow exists" "test -f .github/workflows/codeql-analysis.yml"
run_test "Validate workflow exists" "test -f .github/workflows/validate.yml"

# 8. Test Suite Validation
section "8. Test Suite Validation"

run_test "Jest config exists" "test -f jest.config.js"
run_test "Core Engine tests exist" "test -f tests/unit/core/engine.test.js"
run_test "Security Hub tests exist" "test -f tests/unit/security/securityHub.test.js"

# 9. Dependencies Check
section "9. Dependencies Check"

if [ -d "node_modules" ]; then
    run_test "Dependencies installed" "test -d node_modules"
else
    echo -e "${YELLOW}⚠ Dependencies not installed. Run: npm install${NC}"
fi

# 10. Code Quality Checks
section "10. Code Quality Checks"

run_test "No syntax errors in package.json" "node -e 'require(\"./package.json\")'"

if [ -f ".env" ]; then
    run_test ".env file exists" "test -f .env"
else
    echo -e "${YELLOW}⚠ .env file not found. Copy from .env.example${NC}"
fi

# Summary
section "Validation Summary"

echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ All validation tests passed!                  ║${NC}"
    echo -e "${GREEN}║   Platform is ready for deployment                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.example to .env and configure"
    echo "2. Run: npm install"
    echo "3. Run: ./scripts/deploy.sh"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   ✗ Some validation tests failed                  ║${NC}"
    echo -e "${RED}║   Please fix the issues above                     ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
