const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || "info",
  adminToken: process.env.ADMIN_TOKEN,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [],
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 100),
  maxAgentInputLength: parseNumber(process.env.MAX_AGENT_INPUT_LENGTH, 4000),
  defaultModel: process.env.DEFAULT_MODEL || "gpt-4o-mini",
  modelRouterStrategy: process.env.MODEL_ROUTER_STRATEGY || "balanced",
  fallbackEnabled: parseBoolean(process.env.FALLBACK_ENABLED, true),
  perplexityModel: process.env.PERPLEXITY_MODEL || "llama-3.1-sonar-large-128k-online",
  perplexityCitations: parseBoolean(process.env.PERPLEXITY_CITATIONS, true),
  perplexityRecencyDays: parseNumber(process.env.PERPLEXITY_RECENCY_DAYS, 7),
  moonshotApiKey: process.env.MOONSHOT_API_KEY,
  moonshotModel: process.env.MOONSHOT_MODEL || "moonshot-v1-8k"
};

// Validate admin token in production
if (env.nodeEnv === "production" && !env.adminToken) {
  throw new Error("ADMIN_TOKEN must be set in production");
}

if (env.nodeEnv === "production" && env.adminToken && env.adminToken.length < 16) {
  throw new Error("ADMIN_TOKEN must be at least 16 characters in production");
}
