import fetch from "node-fetch";
import https from "https";
import http from "http";
import { AppError } from "../utils/errors.js";

const API_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// HTTP/HTTPS agent with connection pooling and keep-alive for better performance
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: REQUEST_TIMEOUT_MS
});

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: REQUEST_TIMEOUT_MS
});

export const runGPT = async ({ model, apiKey, system, user, messages }) => {
  if (!apiKey) throw new AppError("Missing API key for model provider", 500, "MISSING_API_KEY");

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
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1200
      }),
      signal: controller.signal,
      agent: API_URL.startsWith('https') ? httpsAgent : httpAgent
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
    throw err;
  }
};
