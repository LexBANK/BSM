import fetch from "node-fetch";
import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";

const MOONSHOT_URL = "https://api.moonshot.cn/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45000;

export class KimiAgent {
  constructor() {
    this.id = "kimi-agent";
    this.name = "Kimi Assistant";
    this.version = "1.0";
  }

  async chat(message, options = {}) {
    const apiKey = env.moonshotApiKey;
    if (!apiKey) {
      throw new AppError("Missing MOONSHOT_API_KEY", 500, "MISSING_API_KEY");
    }

    const model = options.model || env.moonshotModel;
    const temperature = options.temperature ?? 0.3;
    const maxTokens = options.maxTokens ?? 1200;

    logger.info({ model, messageLength: message.length }, `[${this.id}] Sending chat request`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(MOONSHOT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: message }],
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new AppError(`Moonshot request failed: ${errorText}`, 500, "MODEL_REQUEST_FAILED");
      }

      const data = await res.json();
      const output = data.choices?.[0]?.message?.content || "";

      logger.info({ model, usage: data.usage }, `[${this.id}] Chat completed`);

      return {
        agentId: this.id,
        output,
        modelUsed: model,
        usage: data.usage,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      if (err.name === "AbortError") {
        throw new AppError("Moonshot request timeout", 500, "MODEL_TIMEOUT");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const kimiAgent = new KimiAgent();
export default kimiAgent;
