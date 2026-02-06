# ORBIT Self-Healing Agent

> **O**perational **R**esponse and **B**usiness **I**ntelligence **T**oolkit

## Overview

The **ORBIT Self-Healing Agent** is an intelligent monitoring and automation system for the BSM platform. It automatically detects issues, performs corrective actions, and sends real-time notifications via Telegram.

## Features

- **🔧 Self-Healing Actions**: Automated corrective actions for common issues
- **📱 Telegram Notifications**: Real-time alerts for all ORBIT activities
- **📊 Action History**: Track all healing actions and their outcomes
- **🔌 Modular Design**: Easy to extend with new notification channels
- **🎯 Multiple Action Types**: Cache purging, branch cleanup, health checks, and more
- **⚡ Real-time Monitoring**: Continuous system health monitoring

**⚠️ Note**: The current implementation includes simulation logic for demonstration purposes. Actions like cache purging, branch cleanup, and service restarts use simulated delays and random values. In production, replace these with actual API calls to Cloudflare, Git/GitHub, systemctl, or your infrastructure management tools.

## Telegram Setup

### Step 1: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Save the **bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Get Your Chat ID

1. Start a chat with your bot and send any message (e.g., `/start`)
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Replace `<YOUR_BOT_TOKEN>` with your actual bot token
3. Find the `"id"` field under `"chat"` in the JSON response
4. Save the **chat ID** (looks like: `123456789` or `-100123456789`)

### Step 3: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Telegram Notifications (ORBIT Agent)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### Step 4: Test the Connection

Run the test script to verify your setup:

```bash
node scripts/test-telegram-notification.js
```

If successful, you should receive several test messages in your Telegram chat.

## API Endpoints

All ORBIT endpoints are prefixed with `/api/orbit`

### Status & Monitoring

#### Get ORBIT Status
```http
GET /api/orbit/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "active": true,
    "lastHealthCheck": "2026-02-06T15:30:00.000Z",
    "actionCount": 42,
    "telegramEnabled": true,
    "uptime": 123456
  }
}
```

#### Get Action History
```http
GET /api/orbit/history?limit=50
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "history": [
    {
      "timestamp": "2026-02-06T15:30:00.000Z",
      "action": "Cache Purged",
      "details": {
        "status": "Success",
        "target": "Zone: production"
      },
      "success": true
    }
  ]
}
```

### Healing Actions

#### Purge Cloudflare Cache
```http
POST /api/orbit/actions/purge-cache
Content-Type: application/json

{
  "zone": "production"
}
```

#### Clean Git Branches
```http
POST /api/orbit/actions/clean-branches
Content-Type: application/json

{
  "maxAge": 30
}
```

#### Perform Health Check
```http
POST /api/orbit/actions/health-check
```

#### Restart Service
```http
POST /api/orbit/actions/restart-service
Content-Type: application/json

{
  "serviceName": "api-server"
}
```

#### Run Full Healing Cycle
```http
POST /api/orbit/actions/healing-cycle
```

Runs a comprehensive healing cycle including health checks and automated repairs.

#### Execute Custom Action
```http
POST /api/orbit/actions/custom
Content-Type: application/json

{
  "actionName": "Custom Healing Action",
  "actionType": "cache_purge",
  "context": {
    "zone": "staging"
  }
}
```

**Available Action Types:**
- `cache_purge` - Purge Cloudflare cache
- `branch_cleanup` - Clean old Git branches
- `health_check` - Perform system health check
- `service_restart` - Restart a service

### Testing

#### Test Notification
```http
POST /api/orbit/test/notification
Content-Type: application/json

{
  "message": "Test message"
}
```

#### Test Connection
```http
GET /api/orbit/test/connection
```

**Response:**
```json
{
  "success": true,
  "message": "Connection test successful"
}
```

## Notification Examples

### Cache Purge Notification
```
🧹 ORBIT Agent

Action: Cloudflare Cache Purged
Time: 2026-02-06T15:30:00.000Z
Status: Success
Details: Cache successfully purged
Target: Zone: production
Result: All cached content cleared
```

### Branch Cleanup Notification
```
🌿 ORBIT Agent

Action: Git Branches Cleaned
Time: 2026-02-06T15:31:00.000Z
Status: Success
Details: Removed 3 stale branches
Target: Branches older than 30 days
Result: Repository cleaned, 3 branches deleted
```

### Critical Alert Notification
```
🚨 CRITICAL ALERT 🚨

Alert: Service restart failure: api-server
Time: 2026-02-06T15:32:00.000Z
Severity: Critical
Component: api-server
Details: Connection timeout
```

## Programmatic Usage

### Using the ORBIT Agent Service

```javascript
import { orbitAgent } from "./src/services/orbitAgent.js";

// Purge cache
const result = await orbitAgent.purgeCloudflareCache("production");
console.log(result);

// Clean branches
await orbitAgent.cleanGitBranches(30);

// Health check
await orbitAgent.performHealthCheck();

// Restart service
await orbitAgent.restartService("api-server");

// Custom action
await orbitAgent.executeCustomAction(
  "Custom Action",
  async (context) => {
    // Your custom healing logic here
    return { message: "Action completed", result: "Success" };
  },
  { customParam: "value" }
);

// Get history
const history = orbitAgent.getActionHistory(50);

// Get status
const status = orbitAgent.getStatus();
```

### Using the Telegram Notification Service

```javascript
import { telegramNotificationService } from "./src/services/telegramNotificationService.js";

// Send simple message
await telegramNotificationService.send("Hello from ORBIT!");

// Send ORBIT notification
await telegramNotificationService.sendOrbitNotification(
  "Custom Action",
  {
    status: "Success",
    message: "Action completed successfully",
    result: "All systems operational"
  }
);

// Send critical alert
await telegramNotificationService.sendCriticalAlert(
  "System overload detected",
  {
    severity: "Critical",
    component: "Database",
    details: "Connection pool exhausted"
  }
);

// Test connection
const testResult = await telegramNotificationService.testConnection();
console.log(testResult);
```

## Extending the Notification System

The notification system is designed to be modular and extensible. Here's how to add new notification channels:

### 1. Create a New Notification Service

```javascript
// src/services/slackNotificationService.js
class SlackNotificationService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = Boolean(this.webhookUrl);
  }
  
  async send(message) {
    // Implementation
  }
}

export const slackNotificationService = new SlackNotificationService();
```

### 2. Update ORBIT Agent to Use Multiple Channels

```javascript
// In orbitAgent.js
import { telegramNotificationService } from "./telegramNotificationService.js";
import { slackNotificationService } from "./slackNotificationService.js";

// Send to all enabled channels
async notifyAllChannels(action, details) {
  const promises = [];
  
  if (telegramNotificationService.isEnabled()) {
    promises.push(telegramNotificationService.sendOrbitNotification(action, details));
  }
  
  if (slackNotificationService.isEnabled()) {
    promises.push(slackNotificationService.sendOrbitNotification(action, details));
  }
  
  return Promise.allSettled(promises);
}
```

## Dashboard Integration

The ORBIT agent status is available via the status endpoint and can be integrated into the admin dashboard:

```javascript
// Example: Fetch ORBIT status in dashboard
fetch('/api/orbit/status')
  .then(res => res.json())
  .then(data => {
    console.log('ORBIT Status:', data.status);
    // Update dashboard UI with status
  });

// Example: Display recent actions
fetch('/api/orbit/history?limit=10')
  .then(res => res.json())
  .then(data => {
    console.log('Recent Actions:', data.history);
    // Display actions in dashboard
  });
```

## Troubleshooting

### Notifications Not Sending

1. **Check Environment Variables**
   ```bash
   # Verify both are set
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```

2. **Test Connection**
   ```bash
   curl http://localhost:3000/api/orbit/test/connection
   ```

3. **Check Logs**
   Look for Telegram-related errors in server logs

### Bot Not Responding

1. **Verify Bot Token**
   - Visit: `https://api.telegram.org/bot<TOKEN>/getMe`
   - Should return bot information

2. **Verify Chat ID**
   - Send a message to your bot
   - Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find your chat ID in the response

3. **Check Bot Permissions**
   - Ensure the bot can send messages
   - Check if bot is blocked by user

### Common Error Messages

- **"Service disabled"**: Environment variables not set
- **"Unauthorized"**: Invalid bot token
- **"Chat not found"**: Invalid chat ID
- **"Bot was blocked by the user"**: User blocked the bot

## Security Considerations

1. **Keep Bot Token Secret**: Never commit `TELEGRAM_BOT_TOKEN` to version control
2. **Use Environment Variables**: Always use `.env` file for sensitive data
3. **Limit Bot Permissions**: Configure bot with minimal required permissions
4. **Monitor Bot Usage**: Regularly review bot activity logs
5. **Rotate Tokens**: Periodically regenerate bot tokens via @BotFather

## Architecture

```
┌─────────────────────────────────────────┐
│         ORBIT Self-Healing Agent        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │     Monitoring & Detection      │   │
│  │  - Health checks                │   │
│  │  - System metrics               │   │
│  │  - Error detection              │   │
│  └─────────────────────────────────┘   │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐   │
│  │    Healing Action Engine        │   │
│  │  - Cache purge                  │   │
│  │  - Branch cleanup               │   │
│  │  - Service restart              │   │
│  │  - Custom actions               │   │
│  └─────────────────────────────────┘   │
│                 │                       │
│                 ▼                       │
│  ┌─────────────────────────────────┐   │
│  │   Notification Dispatcher       │   │
│  │  - Telegram                     │   │
│  │  - (Extensible for Slack, etc.) │   │
│  └─────────────────────────────────┘   │
│                 │                       │
└─────────────────┼───────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   Telegram Bot  │
         │   📱            │
         └─────────────────┘
```

## Best Practices

1. **Use Descriptive Action Names**: Make it clear what each action does
2. **Provide Context**: Include relevant details in notifications
3. **Monitor History**: Regularly review action history
4. **Test Thoroughly**: Use test endpoints before production deployment
5. **Handle Failures Gracefully**: Ensure critical alerts are sent for failures
6. **Keep Actions Idempotent**: Actions should be safe to retry
7. **Log Everything**: All actions are logged for auditing
8. **Replace Simulations**: Update simulation logic with actual API calls for production

## Production Integration

The current implementation includes simulation logic for demonstration. To use in production:

### 1. Replace Cloudflare Cache Purge Simulation

```javascript
// In src/services/orbitAgent.js, replace simulation with:
import fetch from 'node-fetch';

async purgeCloudflareCache(zone = "default") {
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    }
  );
  
  const result = await response.json();
  // ... handle result and send notification
}
```

### 2. Replace Git Branch Cleanup Simulation

```javascript
// Use GitHub API or local git commands
import { Octokit } from '@octokit/rest';

async cleanGitBranches(maxAge = 30) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);
  
  const { data: branches } = await octokit.repos.listBranches({
    owner: 'your-org',
    repo: 'your-repo'
  });
  
  // Filter and delete old branches
  // ... implementation details
}
```

### 3. Replace Health Check Simulation

```javascript
// Use actual system metrics
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async performHealthCheck() {
  // Get actual CPU usage
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total) * 100;
  }, 0) / cpus.length;
  
  // Get memory usage
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
  
  // Get disk usage (Linux)
  const { stdout } = await execPromise("df -h / | tail -1 | awk '{print $5}'");
  const diskUsage = parseFloat(stdout.replace('%', ''));
  
  const healthStatus = {
    cpu: cpuUsage,
    memory: memoryUsage,
    disk: diskUsage,
    uptime: process.uptime()
  };
  
  // ... rest of implementation
}
```

### 4. Replace Service Restart Simulation

```javascript
// Use systemctl, pm2, or Docker
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async restartService(serviceName) {
  // For systemd services
  await execPromise(`sudo systemctl restart ${serviceName}`);
  
  // Or for PM2
  // await execPromise(`pm2 restart ${serviceName}`);
  
  // Or for Docker
  // await execPromise(`docker restart ${serviceName}`);
  
  // ... handle result and send notification
}
```

### Required Environment Variables for Production

Add these to your `.env` file:

```bash
# Cloudflare (if using cache purge)
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ZONE_ID=your-zone-id

# GitHub (if using branch cleanup)
GITHUB_TOKEN=your-github-token

# Add other credentials as needed
```

## Examples

### Automated Healing Workflow

```javascript
// Set up periodic health checks
setInterval(async () => {
  const healthResult = await orbitAgent.performHealthCheck();
  
  if (!healthResult.success || healthResult.health.cpu > 80) {
    // High CPU detected, trigger cache purge
    await orbitAgent.purgeCloudflareCache();
  }
  
  if (healthResult.health.memory > 85) {
    // High memory, restart service
    await orbitAgent.restartService("memory-intensive-service");
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
- name: Notify ORBIT of Deployment
  run: |
    curl -X POST http://your-server.com/api/orbit/actions/custom \
      -H "Content-Type: application/json" \
      -d '{
        "actionName": "Deployment Complete",
        "actionType": "cache_purge",
        "context": {
          "zone": "production",
          "version": "${{ github.sha }}"
        }
      }'
```

## License

Part of the LexBANK/BSM Platform.

## Support

For issues or questions, please open an issue on the [GitHub repository](https://github.com/LexBANK/BSM).
