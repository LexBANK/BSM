# PR Merge Agent - Implementation Complete

## Overview

The PR Merge Agent is now fully integrated into the BSU platform. It automatically evaluates pull requests based on quality gates and makes merge decisions.

## Features

✅ **Quality Gate Evaluation**
- Code Review Score (minimum 7/10 required)
- Security Vulnerability Check (0 critical vulnerabilities required)
- Integration with other BSU agents

✅ **Automated Decision Making**
- `approve_and_merge`: All quality gates passed
- `request_changes`: One or more gates failed
- Detailed reason for each decision

✅ **Orchestrator Integration**
- Seamless integration with BSU orchestrator
- Two-phase execution (review agents → merge decision)
- Event-driven architecture

## Architecture

### Components

1. **PRMergeAgent.js** (`src/agents/PRMergeAgent.js`)
   - Core evaluation logic
   - `evaluate(prData, otherResults)` method
   - Returns merge decision with conditions

2. **Orchestrator Integration** (`src/runners/orchestrator.js`)
   - `makePRMergeDecision()` function
   - Two-phase execution for PR events
   - Result parsing and aggregation

3. **Agent Configuration** (`data/agents/pr-merge-agent.yaml`)
   - Agent metadata and capabilities
   - Conditions and thresholds
   - Action definitions

### Decision Flow

```
PR Event (opened/synchronize)
    ↓
Orchestrator selects agents
    ↓
Phase 1: Run review agents in parallel
    ├─ code-review-agent → score
    ├─ security-agent → vulnerabilities
    └─ integrity-agent → health score
    ↓
Phase 2: PR Merge Agent evaluates results
    ├─ Check code score >= 7
    ├─ Check critical vulnerabilities == 0
    └─ Generate decision
    ↓
Execute decision (via GitHub Actions or API)
    ├─ approve_and_merge → Auto-merge PR
    └─ request_changes → Block merge + feedback
```

## Quality Gates

| Gate | Condition | Action if Failed |
|------|-----------|------------------|
| Code Review | Score >= 7/10 | Request changes |
| Security | Critical vulnerabilities == 0 | Block PR |
| Both | All conditions met | Approve and merge |

## Usage

### Via Orchestrator API

```javascript
import { orchestrator } from './src/runners/orchestrator.js';

const result = await orchestrator({
  event: 'pull_request.opened',
  payload: {
    prNumber: 123,
    title: 'Feature: Add new API',
    author: 'developer',
    filesChanged: 5
  }
});

console.log(result.decision);
// {
//   action: 'approve_and_merge',
//   reason: 'All quality gates passed',
//   automated: true,
//   conditions: { ... }
// }
```

### Direct Agent Call

```javascript
import { prMergeAgent } from './src/agents/PRMergeAgent.js';

const evaluation = prMergeAgent.evaluate(
  { prNumber: 123 },
  [
    { agentId: 'code-review-agent', score: 8 },
    { agentId: 'security-agent', summary: { critical: 0 } }
  ]
);

console.log(evaluation.action); // 'approve' or 'request_changes'
```

### Via GitHub Webhook

The agent automatically runs when GitHub sends webhook events:
- `pull_request.opened`
- `pull_request.synchronize`
- `pull_request.ready_for_review`
- `check_suite.completed`

## Testing

Run the comprehensive test suite:

```bash
node test-pr-merge-agent.js
```

Test scenarios:
1. ✅ Perfect PR - All gates pass
2. ⚠️  Low Code Quality (score < 7)
3. 🚫 Critical Security Vulnerabilities
4. ❌ Multiple Issues

## Configuration

### Environment Variables

```bash
# Required for agent operations
OPENAI_BSU_KEY=sk-...        # OpenAI API key for GPT models
GITHUB_BSU_TOKEN=ghp_...     # GitHub token for PR operations

# Optional
GITHUB_WEBHOOK_SECRET=...    # Webhook signature verification
GITHUB_REPO=LexBANK/BSM      # Target repository
```

### Agent YAML Configuration

```yaml
id: pr-merge-agent
name: Auto-Merge Orchestrator
role: DevOps Automation Engineer
capabilities:
  - ci_cd_integration
  - quality_gates
  - conflict_resolution
conditions:
  min_approvals: 2
  required_checks:
    - code-review-agent: approved
    - security-agent: passed
    - ci_tests: passed
```

## GitHub Actions Integration

The `.github/workflows/auto-merge.yml` workflow:
1. Runs on PR events
2. Executes agent review pipeline
3. Makes merge decision
4. Posts results as PR comment
5. Auto-merges if approved

## API Endpoints

### Trigger Orchestration

```http
POST /api/orchestrator/run
Content-Type: application/json

{
  "event": "pull_request.opened",
  "payload": {
    "prNumber": 123
  }
}
```

### GitHub Webhook

```http
POST /api/webhooks/github
X-GitHub-Event: pull_request
X-Hub-Signature-256: sha256=...

{
  "action": "opened",
  "pull_request": { ... }
}
```

## Monitoring

The agent emits structured logs:

```json
{
  "level": "info",
  "msg": "[pr-merge-agent] Evaluating merge decision",
  "prNumber": 123,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

## Security Considerations

1. **Token Security**: GitHub tokens are stored as environment variables
2. **Signature Verification**: Webhook signatures verified using `crypto.timingSafeEqual`
3. **Action Whitelist**: Only allowed actions can be executed
4. **Audit Trail**: All decisions logged with timestamp and conditions

## Next Steps

1. ✅ Core functionality complete
2. ✅ Orchestrator integration done
3. ✅ Test suite created
4. 🔄 GitHub Actions workflow active
5. 🔄 Webhook endpoint configured
6. 📋 Monitor in production

## Troubleshooting

### Agent not running

Check logs for:
- Missing API keys (`OPENAI_BSU_KEY`)
- GitHub token issues (`GITHUB_BSU_TOKEN`)
- Webhook signature mismatches

### Merge decisions incorrect

Verify:
- Code review score threshold (default: 7)
- Security vulnerability detection working
- Agent results properly formatted

### Integration issues

Confirm:
- Agent registered in `data/agents/index.json`
- YAML configuration valid
- Orchestrator selecting correct agents for events

## Support

For issues or questions:
- Review logs in `/var/log/bsu/` (if configured)
- Check GitHub Actions workflow runs
- Test individual agent components

---

**Status**: ✅ Implementation Complete
**Version**: 2.0
**Last Updated**: 2026-02-09
