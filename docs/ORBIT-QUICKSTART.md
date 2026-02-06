# ORBIT Quick Start Guide

This guide will help you set up and test the ORBIT Self-Healing Agent with Telegram notifications in under 5 minutes.

## Prerequisites

- Node.js 22+ installed
- A Telegram account
- 5 minutes of your time

## Step 1: Create a Telegram Bot (2 minutes)

1. Open Telegram and search for **@BotFather**
2. Send the command: `/newbot`
3. Follow the prompts to name your bot
4. **Save the bot token** you receive (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Get Your Chat ID (1 minute)

1. Start a chat with your new bot and send any message (e.g., `/start`)
2. Open this URL in your browser (replace `<YOUR_BOT_TOKEN>` with your actual token):
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. Find the `"id"` field under `"chat"` in the JSON response
4. **Save your chat ID** (looks like: `123456789`)

## Step 3: Configure Environment (1 minute)

Add these lines to your `.env` file:

```bash
# Telegram Notifications (ORBIT Agent)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

Replace the values with your actual bot token and chat ID.

## Step 4: Test the Setup (1 minute)

```bash
# Install dependencies (if not already done)
npm install

# Test Telegram notifications
npm run test:telegram

# Start the server
npm start
```

If everything is configured correctly, you'll receive test messages in your Telegram chat!

## Quick API Test

Once the server is running, test these endpoints:

```bash
# Check ORBIT status
curl http://localhost:3000/api/orbit/status

# Trigger a health check (you'll get a Telegram notification!)
curl -X POST http://localhost:3000/api/orbit/actions/health-check

# Purge cache (another notification!)
curl -X POST http://localhost:3000/api/orbit/actions/purge-cache \
  -H "Content-Type: application/json" \
  -d '{"zone":"production"}'

# View action history
curl http://localhost:3000/api/orbit/history
```

## What You Get

🤖 **Automatic Notifications**: Every ORBIT action sends a formatted message to Telegram

📊 **Action Tracking**: All actions are logged with timestamps and details

🔧 **Self-Healing**: Automated health checks and corrective actions

📱 **Real-time Alerts**: Critical alerts are never silenced

🎨 **Smart Formatting**: Actions have appropriate emojis and formatting

## Example Telegram Messages

When you trigger actions, you'll receive messages like:

```
🧹 ORBIT Agent

Action: Cloudflare Cache Purged
Time: 2026-02-06T15:30:00.000Z
Status: Success
Details: Cache successfully purged
Target: Zone: production
Result: All cached content cleared
```

```
🌿 ORBIT Agent

Action: Git Branches Cleaned
Time: 2026-02-06T15:31:00.000Z
Status: Success
Details: Removed 3 stale branches
Target: Branches older than 30 days
Result: Repository cleaned, 3 branches deleted
```

## Next Steps

- 📖 Read the full documentation: [ORBIT-AGENT.md](./ORBIT-AGENT.md)
- 🔌 Add more notification channels (Slack, Discord, etc.)
- 🎯 Create custom healing actions
- 📊 Monitor via the admin dashboard at `/admin`

## Troubleshooting

**Not receiving messages?**
- Verify your bot token is correct
- Make sure you started a chat with your bot
- Check your chat ID is correct
- Ensure the bot isn't blocked

**"Service disabled" message?**
- Check that both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set in `.env`
- Restart the server after updating `.env`

## Need Help?

See [ORBIT-AGENT.md](./ORBIT-AGENT.md) for comprehensive documentation, or open an issue on GitHub.

---

**🎉 Congratulations!** You now have a fully functional self-healing agent with Telegram notifications!
