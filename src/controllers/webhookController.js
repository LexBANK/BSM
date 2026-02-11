import crypto from "crypto";
import { orchestrator } from "../runners/orchestrator.js";
import { executeDecision } from "../actions/githubActions.js";
import logger from "../utils/logger.js";
import { auditLog } from "../utils/auditLogger.js";
import { env } from "../config/env.js";

export const handleGitHubWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const payload = JSON.stringify(req.body);

    if (!verifySignature(payload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
      logger.warn("Invalid webhook signature");
      return res.status(401).send("Unauthorized");
    }

    const event = req.headers["x-github-event"];
    const data = req.body;

    logger.info({ event, action: data?.action }, "Webhook received");

    if (data?.pull_request?.draft) {
      logger.info({ prNumber: data.number }, "Skipping draft PR");
      return res.status(200).json({ status: "skipped", reason: "Draft PR" });
    }

    const orchestrationPayload = transformGitHubEvent(event, data);
    const result = await orchestrator({
      event: `${event}.${data?.action || "unknown"}`,
      payload: orchestrationPayload
    });

    // respond immediately, then execute the decision asynchronously
    res.status(202).json({
      status: "processing",
      jobId: result.jobId,
      message: "Agents are analyzing your request"
    });

    // execute the decision (merge, approve, request changes, etc.)
    const prNumber = data?.pull_request?.number || data?.number;
    if (result.decision && prNumber && process.env.GITHUB_BSU_TOKEN) {
      const execution = await executeDecision(result.decision, prNumber);
      logger.info({ jobId: result.jobId, prNumber, execution }, "Decision executed");
    }
  } catch (error) {
    logger.error({ error }, "Webhook processing failed");
    if (!res.headersSent) {
      return next(error);
    }
  }
};

/**
 * POST /webhook/telegram
 * Telegram webhook handler
 * Requires admin chat ID for /run commands
 * All execution goes through orchestrator
 */
export const handleTelegramWebhook = async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    // Verify secret token if configured
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken) {
      const headerToken = req.headers["x-telegram-bot-api-secret-token"];
      if (headerToken !== secretToken) {
        logger.warn({ correlationId }, "Invalid Telegram webhook secret");
        return res.sendStatus(403);
      }
    }

    const update = req.body;
    if (!update || !update.message) {
      return res.sendStatus(200);
    }

    const message = update.message || update.edited_message;
    const chatId = message?.chat?.id;
    const text = (message?.text || "").trim();
    const username = message?.from?.username;

    // Get admin chat IDs from environment
    const adminChatIds = (process.env.ORBIT_ADMIN_CHAT_IDS || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const isAdmin = adminChatIds.includes(String(chatId));

    logger.info({
      correlationId,
      chatId,
      username,
      isAdmin,
      command: text.split(" ")[0]
    }, "Telegram webhook received");

    // Audit log
    auditLog({
      eventType: "telegram",
      action: "webhook_received",
      correlationId,
      metadata: {
        chatId,
        username,
        isAdmin,
        command: text.split(" ")[0]
      }
    });

    // Handle /run command (admin only)
    if (text.startsWith("/run")) {
      if (!isAdmin) {
        logger.warn({ correlationId, chatId, username }, "Unauthorized /run attempt");
        
        auditLog({
          eventType: "access_denied",
          action: "telegram_run_unauthorized",
          correlationId,
          metadata: { chatId, username }
        });

        await sendTelegramMessage(chatId, "🚫 غير مصرح. هذا الأمر للمشرفين فقط.");
        return res.sendStatus(200);
      }

      // Enforce mobile mode restriction for Telegram
      if (env.mobileMode) {
        logger.info({ correlationId, chatId }, "Mobile mode: Telegram /run blocked");
        await sendTelegramMessage(chatId, "⚠️ MOBILE_MODE نشط. استخدم العميل المكتبي للتنفيذ.");
        return res.sendStatus(200);
      }

      const query = text.replace("/run", "").trim();
      if (!query) {
        await sendTelegramMessage(chatId, "❗ استخدم: /run <السؤال أو الأمر>");
        return res.sendStatus(200);
      }

      // Execute through orchestrator
      await sendTelegramMessage(chatId, `⏳ جاري تنفيذ: ${query}...`);
      
      try {
        const result = await orchestrator({
          event: "telegram.run",
          payload: {
            query,
            source: "telegram",
            chatId,
            username
          },
          context: {
            correlationId,
            initiatedBy: "telegram",
            isMobileMode: env.mobileMode
          }
        });

        auditLog({
          eventType: "agent_execution",
          action: "telegram_run_success",
          correlationId,
          metadata: {
            chatId,
            username,
            jobId: result.jobId
          }
        });

        await sendTelegramMessage(chatId, `✅ تم التنفيذ بنجاح\nJob ID: ${result.jobId}`);
      } catch (err) {
        logger.error({ correlationId, error: err.message }, "Telegram /run failed");
        await sendTelegramMessage(chatId, `❌ فشل التنفيذ: ${err.message}`);
      }

      return res.sendStatus(200);
    }

    // Handle /help or /start
    if (text === "/help" || text === "/start") {
      await sendTelegramMessage(
        chatId,
        "مرحبًا! 👋\n\nالأوامر المتاحة:\n/run <السؤال> - تنفيذ استعلام (للمشرفين فقط)\n/help - عرض المساعدة"
      );
      return res.sendStatus(200);
    }

    // Default response
    await sendTelegramMessage(chatId, "تم استلام رسالتك. استخدم /help للمساعدة.");
    return res.sendStatus(200);

  } catch (err) {
    logger.error({ correlationId, error: err.message }, "Telegram webhook error");
    return res.sendStatus(500);
  }
};

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, cannot send message");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "Failed to send Telegram message");
    }
  } catch (err) {
    logger.error({ error: err.message }, "Error sending Telegram message");
  }
}

function transformGitHubEvent(event, data) {
  const transformers = {
    pull_request: () => ({
      prNumber: data.number,
      title: data.pull_request?.title,
      body: data.pull_request?.body,
      author: data.pull_request?.user?.login,
      branch: data.pull_request?.head?.ref,
      baseBranch: data.pull_request?.base?.ref,
      filesChanged: data.pull_request?.changed_files,
      additions: data.pull_request?.additions,
      deletions: data.pull_request?.deletions,
      diffUrl: data.pull_request?.diff_url,
      repo: data.repository?.full_name,
      isDraft: data.pull_request?.draft
    }),
    check_suite: () => ({
      commit: data.check_suite?.head_commit,
      status: data.check_suite?.status,
      conclusion: data.check_suite?.conclusion,
      prNumbers: (data.check_suite?.pull_requests || []).map(pr => pr.number)
    }),
    push: () => ({
      ref: data.ref,
      commits: data.commits,
      pusher: data.pusher?.name,
      forced: data.forced
    })
  };

  return transformers[event] ? transformers[event]() : data;
}

function verifySignature(payload, signature, secret) {
  if (!secret) {
    return true;
  }
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const digest = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}
