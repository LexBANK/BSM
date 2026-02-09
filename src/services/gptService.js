import fetch from "node-fetch";
import { AppError } from "../utils/errors.js";
import { modelRouter } from "../config/modelRouter.js";

const API_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

export const runGPT = async ({ model, apiKey, system, user, messages, task, complexity, requiresSearch, searchQuery }) => {
  const shouldUseRouter = Boolean(requiresSearch || task || model?.includes("sonar") || model?.includes("perplexity"));

  if (shouldUseRouter) {
    const routed = await modelRouter.execute(
      { system, user, messages },
      {
        model,
        task: task || "chat_response",
        complexity: complexity || "medium",
        requiresSearch: Boolean(requiresSearch),
        searchQuery
      }
    );

    return routed?.output || "";
  }

  const normalizedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!normalizedApiKey) {
    throw new AppError("Missing API key for model provider", 500, "MISSING_API_KEY");
  }

  // Guard against malformed keys copied with quotes/new lines/spaces
  if (/\s/.test(normalizedApiKey) || /["'`]/.test(normalizedApiKey)) {
    throw new AppError("Invalid API key format", 500, "INVALID_API_KEY_FORMAT");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Use full messages array if provided, otherwise build from system+user
  const chatMessages = messages || [
    { role: "system", content: system },
    { role: "user", content: user }
  ];

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${normalizedApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1200
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new AppError(`GPT request failed: ${text}`, 500, "GPT_ERROR");
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new AppError("GPT request timeout", 500, "GPT_TIMEOUT");
    }
    if (err?.code === "ERR_INVALID_CHAR") {
      throw new AppError("Invalid API key format", 500, "INVALID_API_KEY_FORMAT");
    }
    throw err;
  }
};
