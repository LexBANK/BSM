# BSM Custom Agents

This directory contains custom agent definitions for the BSM platform. These agents are specialized AI-powered tools designed to assist with various aspects of platform development, maintenance, and security.

## Available Agents

### 1. BSM Autonomous Architect (`bsm-autonomous-architect.agent.md`)
**Purpose:** Architecture analysis and recommendations

**Capabilities:**
- Repository structure analysis and mapping
- Refactoring and reorganization suggestions
- CI/CD pipeline design
- Documentation generation (Markdown/PR templates)

**Constraints:**
- No secret exposure or requests
- No file modifications without explicit user consent

### 2. BSM Orchestrator (`orchestrator.agent.md`)
**Purpose:** Coordinating multi-agent workflows

**Workflow:**
1. Calls Architect for recommendations
2. Calls Runner for testing and build validation
3. Calls Security for configuration checks
4. Generates consolidated reports

**Outputs:**
- `reports/agents-summary-<timestamp>.md`
- Optional PR with proposed changes (requires approval)

### 3. BSM Runner (`runner.agent.md`)
**Purpose:** Build testing and deployment simulation

**Capabilities:**
- Runs npm/yarn, pytest, docker build
- Collects logs and analyzes stack traces
- Outputs JSON and Markdown results

**Constraints:**
- No automatic commits/pushes
- Requires permission for write operations

### 4. BSM Security Agent (`security.agent.md`)
**Purpose:** Security auditing and configuration review

**Capabilities:**
- Analyzes `.github/workflows`, env examples, config files
- Checks dependencies (Snyk, Trivy, Dependabot integration)
- Recommends Key Management best practices
- Generates secret scanning rules

**Constraints:**
- No secret exposure or requests
- Provides migration guidance to Key Management

## Agent File Format

Each agent definition follows this structure:

```yaml
---
name: Agent Name
description: >
  Brief description of agent purpose and capabilities
---

# Agent Name

Purpose: Detailed purpose statement
Capabilities:
- List of capabilities
Constraints:
- List of constraints
Integration:
- Integration notes and usage examples
```

## Usage

Agents are integrated with GitHub Copilot and can be invoked through:
- GitHub Copilot CLI
- GitHub Actions workflows
- Direct API calls

Example:
```bash
# Via Copilot CLI (if available)
copilot agents run architect --repo . --output architect.json

# Via scripts
./scripts/run_agents.sh
```

## Security Notes

All agents follow strict security guidelines:
- No secrets are exposed or logged
- Configuration read from environment variables only
- All outputs are audit-ready and timestamped
- No file modifications without explicit approval

## Documentation

For more information, see:
- [Main README](../../README.md)
- [Architecture Documentation](../../docs/ARCHITECTURE.md)
- [Agent Orchestration Patterns](../../docs/AGENT-ORCHESTRATION.md)
- [Security Guide](../../docs/SECURITY-DEPLOYMENT.md)
