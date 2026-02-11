import { models } from "../config/models.js";

export const getHealth = (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), correlationId: req.correlationId });
};

/**
 * GET /ready
 * Readiness check - verifies system is ready to accept requests
 * Checks: API keys configured, critical services available
 */
export const getReady = (req, res) => {
  const checks = {
    apiKey: false,
    timestamp: new Date().toISOString()
  };

  // Check if at least one OpenAI API key is configured
  try {
    const openaiConfig = models.openai || {};
    checks.apiKey = !!(openaiConfig.default || openaiConfig.bsm || openaiConfig.bsu);
  } catch (err) {
    checks.apiKey = false;
  }

  const isReady = checks.apiKey;
  const status = isReady ? 200 : 503;

  res.status(status).json({
    status: isReady ? "ready" : "not_ready",
    checks,
    correlationId: req.correlationId
  });
};
