// src/orbit/webhooks/telegram.js
import { telegramAgent } from "../agents/TelegramAgent.js";
import { getSystemStatus } from "../../status/systemStatus.js";

const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function handleTelegramWebhook(req, res) {
  try {
    // التحقق من secret token
    if (SECRET_TOKEN) {
      const headerToken = req.headers["x-telegram-bot-api-secret-token"];
      if (headerToken !== SECRET_TOKEN) {
        return res.sendStatus(403);
      }
    }

    const update = req.body;
    if (!update) return res.sendStatus(200);

    const message = update.message || update.edited_message;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = (message.text || "").trim();

    // قائمة المشرفين
    const admins = (process.env.ORBIT_ADMIN_CHAT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = admins.includes(String(chatId));

    // أمر /status (للمشرفين فقط)
    if (text === "/status") {
      if (!isAdmin) {
        await telegramAgent.sendMessage(chatId, "🚫 ليس لديك صلاحية تنفيذ هذا الأمر.");
        return res.sendStatus(200);
      }

      const status = getSystemStatus();

      const statusMessage =
        `📊 *BSM Status*\n\n` +
        `✅ System: ${status.ok ? "Online" : "Degraded"}\n` +
        `🤖 Agents: ${status.agents}\n` +
        `🔒 Safe Mode: ${status.safeMode ? "ON" : "OFF"}\n` +
        `📱 Mobile Mode: ${status.mobileMode ? "ON" : "OFF"}\n` +
        `🏠 LAN Only: ${status.lanOnly ? "ON" : "OFF"}\n` +
        `⏱️ Uptime: ${status.uptime}s\n` +
        `🌍 Environment: ${status.environment}`;

      await telegramAgent.sendMessage(chatId, statusMessage);
      return res.sendStatus(200);
    }

    // أمر /run (للمشرفين فقط)
    if (text.startsWith("/run")) {
      if (!isAdmin) {
        await telegramAgent.sendMessage(chatId, "🚫 ليس لديك صلاحية تنفيذ هذا الأمر.");
        return res.sendStatus(200);
      }

      const query = text.replace("/run", "").trim();
      if (!query) {
        await telegramAgent.sendMessage(chatId, "❗ استخدم: /run <السؤال أو الأمر>");
        return res.sendStatus(200);
      }

      await telegramAgent.sendMessage(chatId, `⏳ جاري تنفيذ: ${query}...`);
      // TODO: ربط بـ research agent
      await telegramAgent.sendMessage(chatId, `✅ تم استلام الطلب: ${query}`);
      return res.sendStatus(200);
    }

    // أوامر عامة
    if (text === "/help" || text === "/start") {
      const helpMessage = 
        "مرحبًا! الأوامر المتاحة:\n\n" +
        "🔹 /status - حالة النظام (للمشرفين فقط)\n" +
        "🔹 /run <سؤالك> - تنفيذ أمر (للمشرفين فقط)\n" +
        "🔹 /help - عرض هذه الرسالة";
      
      await telegramAgent.sendMessage(chatId, helpMessage);
      return res.sendStatus(200);
    }

    // رد افتراضي
    await telegramAgent.sendMessage(chatId, "تم استلام رسالتك. استخدم /help للمساعدة.");
    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(500);
  }
}
