// src/orbit/webhooks/telegram.js
import { telegramAgent } from "../agents/TelegramAgent.js";
import { systemStatusService } from "../../services/systemStatus.js";
import { agentOrchestrator } from "../../services/agentOrchestrator.js";
import { auditLogger } from "../../utils/auditLogger.js";
import logger from "../../utils/logger.js";

const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Check if user is admin
 */
function isAdmin(chatId) {
  const admins = (process.env.ORBIT_ADMIN_CHAT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return admins.includes(String(chatId));
}

/**
 * Audit telegram command
 */
function auditCommand(command, chatId, success, details = {}) {
  auditLogger.write({
    event: "telegram",
    action: command,
    success,
    user: `telegram:${chatId}`,
    ip: "telegram",
    ...details
  });
}

/**
 * Handle /start command
 */
async function handleStart(chatId) {
  const isAdminUser = isAdmin(chatId);
  auditCommand("TELEGRAM_START", chatId, true);

  const message = `
🤖 *BSM Telegram Bot*

Welcome to the Business Service Management platform!

*Available Commands:*
• /help - Show this help message
• /about - About this system

${isAdminUser ? `
*Admin Commands:*
• /status - System status
• /uptime - System uptime
• /agents - List all agents
• /agent <id> - Agent details
• /modes - Current operating modes
• /safemode - Safe mode status
• /queue - Execution queue
• /last-run - Last agent execution
• /errors - Recent errors
• /audit - Audit log summary
• /run <agent-id> - Execute agent
• /dry-run <agent-id> - Validate agent execution
` : ""}

Use /help for more details.
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /help command
 */
async function handleHelp(chatId) {
  const isAdminUser = isAdmin(chatId);
  auditCommand("TELEGRAM_HELP", chatId, true);

  const message = `
📚 *Help & Commands*

*Public Commands:*
• /start - Welcome message
• /help - This help message
• /about - System information

${isAdminUser ? `
*Monitoring Commands (Admin):*
• /status - Full system status
• /uptime - System uptime details
• /agents - List all agents
• /agent <id> - Get agent details
• /modes - Operating modes (mobile/lan/safe)
• /safemode - Safe mode status
• /queue - Agent execution queue
• /last-run - Last agent execution
• /errors - Recent error log
• /audit - Audit log summary

*Execution Commands (Admin):*
• /run <agent-id> - Execute an agent
• /dry-run <agent-id> - Validate without execution

*Examples:*
\`/agent bsu-security\`
\`/dry-run bsu-runner\`
\`/run agent-legal\`
` : ""}

For more info, visit the documentation.
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /about command
 */
async function handleAbout(chatId) {
  auditCommand("TELEGRAM_ABOUT", chatId, true);

  const status = systemStatusService.getSystemStatus();
  const message = `
ℹ️ *About BSM*

*Business Service Management Platform*
Version: ${status.version}
Environment: ${status.environment}

AI-powered platform for legal services and knowledge management with multi-agent orchestration.

*System Status:*
• Uptime: ${status.uptime.formatted}
• Agents: ${status.agents.running}/${status.agents.total} running
• Health: Operational

*Features:*
• Multi-agent orchestration
• Governance & compliance
• Audit logging
• Mobile mode support

For details: /status (admin only)
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /status command (Admin only)
 */
async function handleStatus(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_STATUS", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_STATUS", chatId, true);

  const status = systemStatusService.getSystemStatus();
  const health = systemStatusService.getHealthStatus();

  const message = `
📊 *System Status*

*Health:* ${health.health === "healthy" ? "✅" : "⚠️"} ${health.health}
*Status:* ${status.status}
*Uptime:* ${status.uptime.formatted}
*Environment:* ${status.environment}

*Modes:*
• Mobile: ${status.modes.mobile ? "✅" : "❌"}
• LAN Only: ${status.modes.lan ? "✅" : "❌"}
• Safe Mode: ${status.modes.safe ? "✅" : "❌"}

*Agents:*
• Total: ${status.agents.total}
• Running: ${status.agents.running}
• Stopped: ${status.agents.stopped}

*Errors:*
• Recent: ${status.errors.recent}
• Last 24h: ${status.errors.last24h}

Updated: ${new Date().toISOString().replace(/T/, " ").replace(/\..+/, "")} UTC
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /uptime command (Admin only)
 */
async function handleUptime(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_UPTIME", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_UPTIME", chatId, true);

  const status = systemStatusService.getSystemStatus();
  const message = `
⏱️ *System Uptime*

*Uptime:* ${status.uptime.formatted}
*Started:* ${new Date(status.uptime.startTime).toISOString().replace(/T/, " ").replace(/\..+/, "")} UTC
*Seconds:* ${status.uptime.seconds}
*Environment:* ${status.environment}

System has been running continuously.
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /agents command (Admin only)
 */
async function handleAgents(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_AGENTS", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_AGENTS", chatId, true);

  try {
    const agents = agentOrchestrator.listAgents();
    
    let message = "🤖 *Available Agents*\n\n";
    agents.forEach(agent => {
      const riskEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" }[agent.risk] || "⚪";
      message += `${riskEmoji} *${agent.name}*\n`;
      message += `  ID: \`${agent.id}\`\n`;
      message += `  Category: ${agent.category}\n`;
      message += `  Risk: ${agent.risk}\n`;
      message += `  Approval: ${agent.approvalRequired ? "Required" : "Not required"}\n\n`;
    });

    message += `\nTotal: ${agents.length} agents\n`;
    message += "Use /agent <id> for details";

    await telegramAgent.sendMessage(chatId, message);
  } catch (error) {
    logger.error({ error: error.message, chatId }, "Failed to list agents");
    await telegramAgent.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /agent <id> command (Admin only)
 */
async function handleAgentInfo(chatId, agentId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_AGENT_INFO", chatId, false, { reason: "unauthorized", agentId });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  if (!agentId) {
    await telegramAgent.sendMessage(chatId, "❗ Usage: /agent <agent-id>");
    return;
  }

  auditCommand("TELEGRAM_AGENT_INFO", chatId, true, { agentId });

  try {
    const agent = agentOrchestrator.getAgentInfo(agentId);
    
    const riskEmoji = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" }[agent.risk.level] || "⚪";
    
    const message = `
${riskEmoji} *${agent.name}*

*ID:* \`${agent.id}\`
*Category:* ${agent.category}
*Risk Level:* ${agent.risk.level}
*Rationale:* ${agent.risk.rationale}

*Approval:*
• Required: ${agent.approval.required ? "Yes" : "No"}
${agent.approval.required ? `• Type: ${agent.approval.type}\n• Approvers: ${agent.approval.approvers.join(", ")}` : ""}

*Startup:*
• Auto-start: ${agent.startup.auto_start ? "Yes" : "No"}
• Profiles: ${agent.startup.allowed_profiles.join(", ")}

*Contexts:*
${agent.contexts.allowed.map(c => `• ${c}`).join("\n")}

*Health Check:*
• Endpoint: ${agent.healthcheck.endpoint}
• Interval: ${agent.healthcheck.interval_seconds}s

Use /run ${agent.id} to execute (if permitted)
    `.trim();

    await telegramAgent.sendMessage(chatId, message);
  } catch (error) {
    logger.error({ error: error.message, chatId, agentId }, "Failed to get agent info");
    await telegramAgent.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
}

/**
 * Handle /modes command (Admin only)
 */
async function handleModes(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_MODES", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_MODES", chatId, true);

  const modes = systemStatusService.getModes();
  
  let message = "⚙️ *Operating Modes*\n\n";
  message += `*Mobile Mode:* ${modes.mobileMode ? "✅ Enabled" : "❌ Disabled"}\n`;
  message += `*LAN Only:* ${modes.lanOnly ? "✅ Enabled" : "❌ Disabled"}\n`;
  message += `*Safe Mode:* ${modes.safeMode ? "✅ Enabled" : "❌ Disabled"}\n`;
  message += `*Egress Policy:* ${modes.egressPolicy}\n`;

  if (modes.restrictions.length > 0) {
    message += "\n*Active Restrictions:*\n";
    modes.restrictions.forEach(r => {
      message += `• ${r.replace(/_/g, " ")}\n`;
    });
  } else {
    message += "\n✅ No restrictions active";
  }

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /safemode command (Admin only)
 */
async function handleSafeMode(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_SAFEMODE", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_SAFEMODE", chatId, true);

  const modes = systemStatusService.getModes();
  
  const message = `
🛡️ *Safe Mode Status*

*Status:* ${modes.safeMode ? "✅ ENABLED" : "❌ DISABLED"}

${modes.safeMode ? `
Safe mode is currently active.

*Restrictions:*
• External API calls blocked
• Agent execution disabled
• Read-only operations only

This is a protective measure to prevent unintended operations.
` : `
Safe mode is currently disabled.

The system is operating normally with full capabilities.
`}

Environment: ${systemStatusService.getSystemStatus().environment}
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /queue command (Admin only)
 */
async function handleQueue(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_QUEUE", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_QUEUE", chatId, true);

  const queue = systemStatusService.getExecutionQueue();
  
  const message = `
📋 *Execution Queue*

*Pending:* ${queue.pending.length}
*Running:* ${queue.running.length}

${queue.message || "Queue is empty"}

Note: Queue system is a placeholder for future implementation.
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /last-run command (Admin only)
 */
async function handleLastRun(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_LAST_RUN", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_LAST_RUN", chatId, true);

  const lastExecution = systemStatusService.getLastExecution();
  
  if (!lastExecution) {
    await telegramAgent.sendMessage(chatId, "📋 *Last Execution*\n\nNo executions recorded yet.");
    return;
  }

  const statusEmoji = lastExecution.success ? "✅" : "❌";
  
  const message = `
📋 *Last Agent Execution*

${statusEmoji} *Status:* ${lastExecution.success ? "Success" : "Failed"}
*Agent:* ${lastExecution.agentId}
*Time:* ${new Date(lastExecution.timestamp).toISOString().replace(/T/, " ").replace(/\..+/, "")} UTC
*Duration:* ${lastExecution.duration}ms
*Actor:* ${lastExecution.actor}
*Mode:* ${lastExecution.mode}
  `.trim();

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /errors command (Admin only)
 */
async function handleErrors(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_ERRORS", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_ERRORS", chatId, true);

  const errors = systemStatusService.getRecentErrors(5);
  
  if (errors.length === 0) {
    await telegramAgent.sendMessage(chatId, "✅ *Recent Errors*\n\nNo errors recorded.");
    return;
  }

  let message = "⚠️ *Recent Errors* (last 5)\n\n";
  errors.forEach((error, index) => {
    const time = new Date(error.timestamp).toISOString().replace(/T/, " ").replace(/\..+/, "");
    message += `${index + 1}. *${error.message}*\n`;
    message += `   Time: ${time} UTC\n`;
    if (error.code) message += `   Code: ${error.code}\n`;
    message += "\n";
  });

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /audit command (Admin only)
 */
async function handleAudit(chatId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_AUDIT", chatId, false, { reason: "unauthorized" });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  auditCommand("TELEGRAM_AUDIT", chatId, true);

  const audit = systemStatusService.getAuditSummary();
  
  if (audit.error) {
    await telegramAgent.sendMessage(chatId, `❌ *Audit Log*\n\nError: ${audit.message}`);
    return;
  }

  let message = "📜 *Audit Log Summary*\n\n";
  message += `*Total Entries:* ${audit.totalEntries}\n`;
  message += `*Recent Entries:* ${audit.recentEntries}\n\n`;
  
  if (audit.eventBreakdown && Object.keys(audit.eventBreakdown).length > 0) {
    message += "*Event Breakdown:*\n";
    Object.entries(audit.eventBreakdown).forEach(([event, count]) => {
      message += `• ${event}: ${count}\n`;
    });
  }

  await telegramAgent.sendMessage(chatId, message);
}

/**
 * Handle /run <agent-id> command (Admin only)
 */
async function handleRun(chatId, agentId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_RUN_REQUEST", chatId, false, { reason: "unauthorized", agentId });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  if (!agentId) {
    await telegramAgent.sendMessage(chatId, "❗ Usage: /run <agent-id>");
    return;
  }

  auditCommand("TELEGRAM_RUN_REQUEST", chatId, true, { agentId });

  const context = {
    mode: "mobile",
    actor: `telegram:${chatId}`,
    ip: "telegram"
  };

  try {
    await telegramAgent.sendMessage(chatId, `⏳ Executing agent: ${agentId}...`);

    const result = await agentOrchestrator.runPipeline(agentId, context);

    const statusEmoji = result.success ? "✅" : "❌";
    const message = `
${statusEmoji} *Execution ${result.success ? "Complete" : "Failed"}*

*Agent:* ${result.agentId}
*Duration:* ${result.duration}ms
*Message:* ${result.message}

${result.note ? `\n_${result.note}_` : ""}
    `.trim();

    await telegramAgent.sendMessage(chatId, message);
  } catch (error) {
    logger.error({ error: error.message, chatId, agentId }, "Agent execution failed");
    
    const message = `
❌ *Execution Failed*

*Agent:* ${agentId}
*Error:* ${error.message}
${error.data?.restrictions ? `\n*Restrictions:* ${error.data.restrictions.join(", ")}` : ""}
    `.trim();

    await telegramAgent.sendMessage(chatId, message);
  }
}

/**
 * Handle /dry-run <agent-id> command (Admin only)
 */
async function handleDryRun(chatId, agentId) {
  if (!isAdmin(chatId)) {
    auditCommand("TELEGRAM_DRY_RUN", chatId, false, { reason: "unauthorized", agentId });
    await telegramAgent.sendMessage(chatId, "🚫 Unauthorized");
    return;
  }

  if (!agentId) {
    await telegramAgent.sendMessage(chatId, "❗ Usage: /dry-run <agent-id>");
    return;
  }

  auditCommand("TELEGRAM_DRY_RUN", chatId, true, { agentId });

  const context = {
    mode: "mobile",
    actor: `telegram:${chatId}`,
    ip: "telegram"
  };

  try {
    await telegramAgent.sendMessage(chatId, `🔍 Validating agent: ${agentId}...`);

    const result = await agentOrchestrator.dryRun(agentId, context);

    const message = `
✅ *Validation Passed*

*Agent:* ${result.agentId}
*Mode:* ${result.mode}
*Duration:* ${result.duration}ms

${result.message}

Agent can be executed with: /run ${agentId}
    `.trim();

    await telegramAgent.sendMessage(chatId, message);
  } catch (error) {
    logger.error({ error: error.message, chatId, agentId }, "Dry run validation failed");
    
    const message = `
❌ *Validation Failed*

*Agent:* ${agentId}
*Error:* ${error.message}
${error.data?.restrictions ? `\n*Restrictions:* ${error.data.restrictions.join(", ")}` : ""}
    `.trim();

    await telegramAgent.sendMessage(chatId, message);
  }
}

/**
 * Main webhook handler
 */
export async function handleTelegramWebhook(req, res) {
  try {
    // Verify secret token
    if (SECRET_TOKEN) {
      const headerToken = req.headers["x-telegram-bot-api-secret-token"];
      if (headerToken !== SECRET_TOKEN) {
        logger.warn("Invalid Telegram webhook secret");
        return res.sendStatus(403);
      }
    }

    const update = req.body;
    if (!update) return res.sendStatus(200);

    const message = update.message || update.edited_message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // Log incoming message
    logger.debug({ chatId, command: text.split(" ")[0] }, "Telegram command received");

    // Parse command and arguments
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Route commands
    switch (command) {
      case "/start":
        await handleStart(chatId);
        break;
      
      case "/help":
        await handleHelp(chatId);
        break;
      
      case "/about":
        await handleAbout(chatId);
        break;
      
      case "/status":
        await handleStatus(chatId);
        break;
      
      case "/uptime":
        await handleUptime(chatId);
        break;
      
      case "/agents":
        await handleAgents(chatId);
        break;
      
      case "/agent":
        await handleAgentInfo(chatId, args[0]);
        break;
      
      case "/modes":
        await handleModes(chatId);
        break;
      
      case "/safemode":
        await handleSafeMode(chatId);
        break;
      
      case "/queue":
        await handleQueue(chatId);
        break;
      
      case "/last-run":
        await handleLastRun(chatId);
        break;
      
      case "/errors":
        await handleErrors(chatId);
        break;
      
      case "/audit":
        await handleAudit(chatId);
        break;
      
      case "/run":
        await handleRun(chatId, args[0]);
        break;
      
      case "/dry-run":
        await handleDryRun(chatId, args[0]);
        break;
      
      default:
        // Unknown command
        await telegramAgent.sendMessage(
          chatId,
          "❓ Unknown command. Use /help to see available commands."
        );
    }

    return res.sendStatus(200);
  } catch (err) {
    logger.error({ error: err.message }, "Telegram webhook error");
    systemStatusService.logError(err, { source: "telegram_webhook" });
    return res.sendStatus(500);
  }
}
