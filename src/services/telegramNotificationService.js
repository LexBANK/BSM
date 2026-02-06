import fetch from "node-fetch";
import logger from "../utils/logger.js";

/**
 * Telegram Notification Service
 * 
 * Modular notification service for sending messages to Telegram.
 * Designed to be extensible for adding other notification channels.
 * 
 * Setup Instructions:
 * 1. Create a Telegram bot via @BotFather
 * 2. Get your bot token
 * 3. Start a chat with your bot and send a message
 * 4. Get your chat ID via https://api.telegram.org/bot<TOKEN>/getUpdates
 * 5. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env
 */

class TelegramNotificationService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.enabled = Boolean(this.botToken && this.chatId);
    
    if (!this.enabled) {
      logger.warn("Telegram notifications disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
    } else {
      logger.info("Telegram notification service initialized");
    }
  }

  /**
   * Send a notification message
   * @param {string} message - The message to send
   * @param {object} options - Optional settings
   * @param {string} options.parseMode - 'Markdown' or 'HTML'
   * @param {boolean} options.disableNotification - Silent notification
   * @returns {Promise<object>} Response from Telegram API
   */
  async send(message, options = {}) {
    if (!this.enabled) {
      logger.warn("Telegram notification skipped (service disabled):", message);
      return { success: false, reason: "service_disabled" };
    }

    const {
      parseMode = "Markdown",
      disableNotification = false
    } = options;

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    
    const payload = {
      chat_id: this.chatId,
      text: message,
      parse_mode: parseMode,
      disable_notification: disableNotification
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error("Telegram notification failed:", data);
        return { success: false, error: data };
      }

      logger.info("Telegram notification sent successfully");
      return { success: true, data };
    } catch (error) {
      logger.error("Error sending Telegram notification:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send an ORBIT agent notification
   * @param {string} action - The action performed (e.g., "Cache Purged", "Branch Cleaned")
   * @param {object} details - Additional details about the action
   * @returns {Promise<object>}
   */
  async sendOrbitNotification(action, details = {}) {
    const timestamp = new Date().toISOString();
    const emoji = this.getActionEmoji(action);
    
    let message = `${emoji} *ORBIT Agent*\n\n`;
    message += `*Action:* ${action}\n`;
    message += `*Time:* ${timestamp}\n`;
    
    if (details.status) {
      message += `*Status:* ${details.status}\n`;
    }
    
    if (details.message) {
      message += `*Details:* ${details.message}\n`;
    }
    
    if (details.target) {
      message += `*Target:* ${details.target}\n`;
    }
    
    if (details.result) {
      message += `*Result:* ${details.result}\n`;
    }

    return this.send(message);
  }

  /**
   * Send a critical alert notification
   * @param {string} alert - The critical alert message
   * @param {object} context - Additional context
   * @returns {Promise<object>}
   */
  async sendCriticalAlert(alert, context = {}) {
    const timestamp = new Date().toISOString();
    
    let message = `🚨 *CRITICAL ALERT* 🚨\n\n`;
    message += `*Alert:* ${alert}\n`;
    message += `*Time:* ${timestamp}\n`;
    
    if (context.severity) {
      message += `*Severity:* ${context.severity}\n`;
    }
    
    if (context.component) {
      message += `*Component:* ${context.component}\n`;
    }
    
    if (context.details) {
      message += `*Details:* ${context.details}\n`;
    }

    // Critical alerts are never silent
    return this.send(message, { disableNotification: false });
  }

  /**
   * Get an emoji for an action type
   * @param {string} action - The action name
   * @returns {string} Appropriate emoji
   */
  getActionEmoji(action) {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes("cache") || actionLower.includes("purge")) return "🧹";
    if (actionLower.includes("branch") || actionLower.includes("clean")) return "🌿";
    if (actionLower.includes("deploy") || actionLower.includes("release")) return "🚀";
    if (actionLower.includes("heal") || actionLower.includes("repair")) return "🔧";
    if (actionLower.includes("monitor") || actionLower.includes("check")) return "👁️";
    if (actionLower.includes("backup") || actionLower.includes("restore")) return "💾";
    if (actionLower.includes("security") || actionLower.includes("scan")) return "🔒";
    if (actionLower.includes("error") || actionLower.includes("fail")) return "❌";
    if (actionLower.includes("success") || actionLower.includes("complete")) return "✅";
    
    return "🤖"; // Default robot emoji
  }

  /**
   * Check if the service is enabled and configured
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Test the Telegram connection
   * @returns {Promise<object>}
   */
  async testConnection() {
    if (!this.enabled) {
      return {
        success: false,
        message: "Service is not enabled. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID."
      };
    }

    const testMessage = "🧪 *Test Message*\n\nTelegram notification service is working correctly!";
    const result = await this.send(testMessage);
    
    return {
      success: result.success,
      message: result.success 
        ? "Connection test successful" 
        : "Connection test failed",
      details: result
    };
  }
}

// Export singleton instance
export const telegramNotificationService = new TelegramNotificationService();

// Also export the class for testing
export { TelegramNotificationService };
