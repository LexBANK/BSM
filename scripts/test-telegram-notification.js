#!/usr/bin/env node

/**
 * Test Telegram Notification System
 * 
 * This script tests the Telegram notification service.
 * 
 * Usage:
 *   node scripts/test-telegram-notification.js
 * 
 * Requirements:
 *   - TELEGRAM_BOT_TOKEN must be set in .env
 *   - TELEGRAM_CHAT_ID must be set in .env
 * 
 * Setup:
 *   1. Create a bot via @BotFather on Telegram
 *   2. Get your bot token
 *   3. Start a chat with your bot
 *   4. Visit: https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates
 *   5. Find your chat ID in the response
 *   6. Set both values in your .env file
 */

import { telegramNotificationService } from "../src/services/telegramNotificationService.js";
import { logger } from "../src/utils/logger.js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testNotificationService() {
  console.log("=".repeat(60));
  console.log("ORBIT Telegram Notification Test");
  console.log("=".repeat(60));
  console.log();

  // Check if service is enabled
  const isEnabled = telegramNotificationService.isEnabled();
  console.log(`Service enabled: ${isEnabled ? "✅ YES" : "❌ NO"}`);
  
  if (!isEnabled) {
    console.log();
    console.log("⚠️  Service is not enabled.");
    console.log();
    console.log("Please set the following in your .env file:");
    console.log("  TELEGRAM_BOT_TOKEN=your-bot-token-here");
    console.log("  TELEGRAM_CHAT_ID=your-chat-id-here");
    console.log();
    console.log("Setup instructions:");
    console.log("  1. Create a bot via @BotFather on Telegram");
    console.log("  2. Get your bot token from @BotFather");
    console.log("  3. Start a chat with your bot and send /start");
    console.log("  4. Get your chat ID from:");
    console.log("     https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates");
    console.log();
    process.exit(1);
  }

  console.log();
  console.log("Running tests...");
  console.log();

  // Test 1: Connection test
  console.log("Test 1: Testing connection...");
  try {
    const connectionResult = await telegramNotificationService.testConnection();
    console.log(`  Result: ${connectionResult.success ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`  Message: ${connectionResult.message}`);
    if (!connectionResult.success) {
      console.log(`  Details:`, connectionResult.details);
    }
  } catch (error) {
    console.log(`  Result: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
  }
  
  await sleep(2000);

  // Test 2: Simple message
  console.log();
  console.log("Test 2: Sending simple message...");
  try {
    const result = await telegramNotificationService.send(
      "🧪 *Test Message*\n\nThis is a simple test message from the ORBIT notification system."
    );
    console.log(`  Result: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
  } catch (error) {
    console.log(`  Result: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
  }
  
  await sleep(2000);

  // Test 3: ORBIT notification
  console.log();
  console.log("Test 3: Sending ORBIT action notification...");
  try {
    const result = await telegramNotificationService.sendOrbitNotification(
      "Cache Purged",
      {
        status: "Success",
        target: "Zone: production",
        message: "Cloudflare cache successfully cleared",
        result: "All cached content purged"
      }
    );
    console.log(`  Result: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
  } catch (error) {
    console.log(`  Result: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
  }
  
  await sleep(2000);

  // Test 4: Critical alert
  console.log();
  console.log("Test 4: Sending critical alert...");
  try {
    const result = await telegramNotificationService.sendCriticalAlert(
      "Test Critical Alert",
      {
        severity: "High",
        component: "Test Component",
        details: "This is a test critical alert from the notification system"
      }
    );
    console.log(`  Result: ${result.success ? "✅ PASS" : "❌ FAIL"}`);
  } catch (error) {
    console.log(`  Result: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
  }
  
  await sleep(2000);

  // Test 5: Different action emojis
  console.log();
  console.log("Test 5: Testing action emojis...");
  const actions = [
    "Cache Purged",
    "Branch Cleaned",
    "Deploy Complete",
    "System Healed",
    "Health Check",
    "Backup Created",
    "Security Scan"
  ];
  
  for (const action of actions) {
    const emoji = telegramNotificationService.getActionEmoji(action);
    console.log(`  ${emoji} ${action}`);
  }
  console.log(`  Result: ✅ PASS`);

  // Summary
  console.log();
  console.log("=".repeat(60));
  console.log("Test Summary");
  console.log("=".repeat(60));
  console.log("All tests completed!");
  console.log();
  console.log("Check your Telegram chat to see the received messages.");
  console.log();
  console.log("If you received all test messages, the notification");
  console.log("system is working correctly! ✅");
  console.log("=".repeat(60));
}

// Run tests
testNotificationService().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
