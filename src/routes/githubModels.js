import { Router } from "express";
import { runGitHubModels } from "../services/githubModelsService.js";
import { models } from "../config/models.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

const router = Router();

// GitHub Models chat endpoint
router.post("/", async (req, res, next) => {
  try {
    const { message, history = [], model, maxTokens } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      throw new AppError("Message is required", 400, "INVALID_INPUT");
    }

    if (message.length > env.maxAgentInputLength) {
      throw new AppError("Message too long", 400, "INPUT_TOO_LONG");
    }

    const githubToken = models.github?.token;
    if (!githubToken) {
      throw new AppError("GitHub token not configured", 500, "MISSING_API_KEY");
    }

    const modelName = model || models.github?.model || env.githubModelsModel;

    // Build messages array from history
    const messages = [];

    // Add conversation history (limit to last 20 messages)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: String(msg.content).slice(0, env.maxAgentInputLength)
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const result = await runGitHubModels({
      model: modelName,
      apiKey: githubToken,
      messages,
      maxTokens: maxTokens || 2048
    });

    const output = result || "No response received.";

    res.json({
      output,
      model: modelName
    });
  } catch (err) {
    next(err);
  }
});

export default router;
