# ORBIT Self-Healing Hybrid Agent

## Overview

ORBIT (Operational Resilience & Business Intelligence Toolkit) is a self-healing hybrid agent for the BSM platform that automatically detects, diagnoses, and repairs system issues.

## Features

- **Automated Health Monitoring**: Continuously monitors system metrics and detects anomalies
- **Self-Healing Actions**: Automatically executes repair actions for common issues
- **GitHub Integration**: Triggers GitHub Actions workflows via repository_dispatch events
- **Configurable Rules**: Define custom healing rules and policies
- **Scheduled Tasks**: Schedule automated maintenance and health checks
- **Deduplication Tools**: Remove duplicate files and detect code duplication

## Architecture

### Core Components

1. **orbit.engine.ts** - Main orchestration engine
   - Health check monitoring
   - Issue detection
   - Automated repair coordination
   - History tracking

2. **orbit.worker.ts** - Background worker
   - GitHub Actions integration via repository_dispatch
   - Service monitoring
   - Webhook notifications
   - Uses OWNER/REPO placeholder for flexible deployment

3. **orbit.actions.ts** - Repair action handlers
   - Memory management (GC, cache clearing)
   - Service restarts
   - Database reconnection
   - Cache warmup
   - Temp file cleanup

4. **orbit.rules.ts** - Rules engine (placeholder)
   - Custom healing rules
   - Conditional actions
   - Priority-based execution

5. **orbit.scheduler.ts** - Task scheduler (placeholder)
   - Cron-like scheduling
   - Automated maintenance tasks
   - Task management

### Supporting Scripts

- **dedupe-files.sh** - Removes duplicate files by content hash
- **dedupe-code.sh** - Detects and reports code duplication
- **.github/workflows/orbit-actions.yml** - GitHub Actions workflow for automated healing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build TypeScript files:
```bash
npm run build:orbit
```

3. Configure environment variables:
```bash
# Optional: GitHub integration
export GITHUB_TOKEN=your_github_token
export GITHUB_REPO=OWNER/REPO

# Optional: Webhook notifications
export ORBIT_WEBHOOK_URL=https://your-webhook-url
export ORBIT_NOTIFICATIONS=true
```

## Usage

### Starting ORBIT Engine

```javascript
import { orbitEngine } from './src/agents/orbit/orbit.engine.js';

// Start with default 1-minute interval
await orbitEngine.start();

// Start with custom interval (5 minutes)
await orbitEngine.start({ interval: 300000 });

// Get status
const status = orbitEngine.getStatus();
console.log(status);

// Stop engine
orbitEngine.stop();
```

### Manual Repair

```javascript
// Trigger manual repair
await orbitEngine.manualRepair('high_memory_usage');
```

### Running Deduplication Scripts

```bash
# File deduplication (dry run)
DRY_RUN=true npm run dedupe:files

# File deduplication (actual removal)
DRY_RUN=false npm run dedupe:files

# Code duplication analysis
npm run dedupe:code
```

### GitHub Actions Integration

The ORBIT worker can trigger GitHub Actions workflows via repository_dispatch:

```bash
# Workflow is triggered automatically by ORBIT engine
# Or manually via GitHub UI or API
gh workflow run orbit-actions.yml \
  -f issue_type=high_memory_usage \
  -f action=auto_heal
```

## Supported Issue Types

- `high_memory_usage` - Memory usage > 90%
- `elevated_memory_usage` - Memory usage > 80%
- `high_api_latency` - API latency > 5000ms
- `high_error_rate` - Error rate > 5%
- `disk_space_low` - Low disk space
- `service_unresponsive` - Service not responding
- `database_connection_error` - Database connection issues
- `cache_miss_rate_high` - High cache miss rate

## Automated Healing Actions

- **force_garbage_collection** - Force Node.js GC (requires --expose-gc)
- **clear_caches** - Clear application caches
- **restart_slow_services** - Restart underperforming services
- **restart_failed_services** - Restart crashed services
- **cleanup_temp_files** - Remove temporary files
- **restart_service** - Restart specific service
- **reconnect_database** - Reset database connections
- **warmup_cache** - Preload frequently accessed data

## Configuration

### Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token for API access
- `GITHUB_REPO` - Repository in format "OWNER/REPO"
- `ORBIT_WEBHOOK_URL` - Webhook URL for notifications
- `ORBIT_NOTIFICATIONS` - Enable/disable notifications (true/false)
- `NODE_ENV` - Environment (production/development)

### TypeScript Configuration

See `tsconfig.json` for TypeScript compiler options.

## GitHub Actions Workflow

The `orbit-actions.yml` workflow:

1. Listens for `repository_dispatch` events with type `orbit_actions`
2. Extracts issue details from event payload
3. Executes appropriate healing actions
4. Runs validation and health checks
5. Generates healing reports
6. Uploads artifacts for analysis

## Development

### Building

```bash
npm run build:orbit
```

### Testing

```bash
# Run validation
npm run validate

# Test deduplication scripts
DRY_RUN=true ./scripts/dedupe-files.sh
./scripts/dedupe-code.sh
```

## Integration with BSM

ORBIT is designed as a core self-healing module for the BSM (Business Service Management) platform. It:

- Monitors BSM services automatically
- Heals common issues without manual intervention
- Integrates with existing BSM agents
- Provides healing history and metrics
- Triggers GitHub Actions for complex repairs

## Future Enhancements

- [ ] Advanced rule engine with condition evaluation
- [ ] Cron-based task scheduling
- [ ] Machine learning for anomaly detection
- [ ] Integration with external monitoring tools (Prometheus, Grafana)
- [ ] Slack/Teams notifications
- [ ] Custom action plugins
- [ ] Multi-region health monitoring
- [ ] Automated scaling actions

## License

Part of the BSM platform - See main repository license.

## Support

For issues and questions, please use the main BSM repository issue tracker.
