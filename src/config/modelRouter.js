import fetch from "node-fetch";
import { models } from "./models.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

const TIMEOUT_MS = 35000;

export class MultiModelRouter {
  constructor() {
    this.modelMapping = {
      "gpt-4o": { provider: "openai", model: "gpt-4o" },
      "gpt-4": { provider: "openai", model: "gpt-4" },
      "claude-3-sonnet": { provider: "anthropic", model: "claude-3-5-sonnet-latest" },
      "gemini-1.5-pro": { provider: "google", model: "gemini-1.5-pro" },
      "perplexity-online": { provider: "perplexity", model: "llama-3.1-sonar-large-128k-online" }
    };
  }

  async execute(prompt, options = {}) {
    const { task = "generic", complexity = "medium", requiresSearch = false } = options;
    const modelName = this.selectModel(task, complexity, requiresSearch);

    try {
      const response = await this.callModel(modelName, prompt);
      return { ...response, modelUsed: modelName };
    } catch (error) {
      logger.warn({ modelName, error: error.message }, "Primary model failed; using fallback model");
      const fallbackName = this.getFallbackModel(modelName);
      const response = await this.callModel(fallbackName, prompt);
      return { ...response, modelUsed: `${fallbackName} (fallback)` };
    }
  }

  selectModel(task, complexity, requiresSearch) {
    if (requiresSearch) return "perplexity-online";

    const taskProfiles = {
      code_review: {
        critical: "gpt-4",
        high: "gpt-4o",
        medium: "claude-3-sonnet",
        low: "claude-3-sonnet"
      },
      security_scan: {
        critical: "gpt-4",
        high: "perplexity-online",
        medium: "claude-3-sonnet",
        low: "claude-3-sonnet"
      }
    };

    return taskProfiles[task]?.[complexity] || "gpt-4o";
  }

  getFallbackModel(modelName) {
    const fallback = {
      "perplexity-online": "gpt-4o",
      "gpt-4": "gpt-4o",
      "gpt-4o": "claude-3-sonnet",
      "claude-3-sonnet": "gemini-1.5-pro",
      "gemini-1.5-pro": "gpt-4o"
    };

    return fallback[modelName] || "gpt-4o";
  }

  async callModel(modelName, prompt) {
    const config = this.modelMapping[modelName];
    if (!config) throw new AppError(`Unknown model mapping: ${modelName}`, 500, "MODEL_MAPPING_ERROR");

    switch (config.provider) {
      case "openai":
        return this.callOpenAI(config.model, prompt);
      case "anthropic":
        return this.callAnthropic(config.model, prompt);
      case "google":
        return this.callGoogle(config.model, prompt);
      case "perplexity":
        return this.callPerplexity(config.model, prompt);
      default:
        throw new AppError(`Unsupported provider: ${config.provider}`, 500, "MODEL_PROVIDER_ERROR");
    }
  }

  async callOpenAI(model, prompt) {
    const apiKey = models.openai?.default;
    if (!apiKey) throw new AppError("Missing OPENAI_BSU_KEY", 500, "MISSING_OPENAI_KEY");

    return this.postJson("https://api.openai.com/v1/chat/completions", {
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        temperature: 0.2
      },
      provider: "openai"
    });
  }

  async callAnthropic(model, prompt) {
    const apiKey = process.env.ANTHROPIC_KEY;
    if (!apiKey) throw new AppError("Missing ANTHROPIC_KEY", 500, "MISSING_ANTHROPIC_KEY");

    const result = await this.postJson("https://api.anthropic.com/v1/messages", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: {
        model,
        max_tokens: 1400,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }]
      },
      provider: "anthropic"
    });

    return {
      output: result.raw?.content?.[0]?.text || "",
      usage: result.raw?.usage || {}
    };
  }

  async callGoogle(model, prompt) {
    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) throw new AppError("Missing GOOGLE_AI_KEY", 500, "MISSING_GOOGLE_KEY");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const result = await this.postJson(url, {
      body: {
        contents: [{ parts: [{ text: `${prompt.system}\n\n${prompt.user}` }] }]
      },
      provider: "google"
    });

    return {
      output: result.raw?.candidates?.[0]?.content?.parts?.[0]?.text || "",
      usage: result.raw?.usageMetadata || {}
    };
  }

  async callPerplexity(model, prompt) {
    const apiKey = process.env.PERPLEXITY_KEY;
    if (!apiKey) throw new AppError("Missing PERPLEXITY_KEY", 500, "MISSING_PERPLEXITY_KEY");

    const result = await this.postJson("https://api.perplexity.ai/chat/completions", {
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        return_citations: true,
        temperature: 0.1
      },
      provider: "perplexity"
    });

    return {
      output: result.raw?.choices?.[0]?.message?.content || "",
      usage: result.raw?.usage || {},
      citations: result.raw?.citations || []
    };
  }

  async postJson(url, { headers = {}, body, provider }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const text = await response.text();
        throw new AppError(`${provider} request failed: ${text}`, 502, "MODEL_API_ERROR");
      }

      const raw = await response.json();
      return {
        output: raw.choices?.[0]?.message?.content || "",
        usage: raw.usage || {},
        raw
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const modelRouter = new MultiModelRouter();
