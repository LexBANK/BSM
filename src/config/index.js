import fs from "fs";
import path from "path";
import { env } from "./env.js";

export const config = {
  server: {
    port: env.port,
    host: process.env.HOST || "0.0.0.0",
    env: env.nodeEnv,
    logLevel: env.logLevel
  },
  security: {
    adminToken: env.adminToken,
    corsOrigins: env.corsOrigins,
    rateLimitWindow: env.rateLimitWindowMs,
    rateLimitMax: env.rateLimitMax,
    maxInputLength: env.maxAgentInputLength
  },
  ai: {
    bsmKey: process.env.OPENAI_BSM_KEY,
    brinderKey: process.env.OPENAI_BRINDER_KEY,
    lexnexusKey: process.env.OPENAI_LEXNEXUS_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini"
  },
  paths: {
    agents: path.join(process.cwd(), "data", "agents"),
    knowledge: path.join(process.cwd(), "data", "knowledge"),
    logs: path.join(process.cwd(), "logs")
  },
  requiredAgents: [
    "code-review-agent.yaml",
    "governance-agent.yaml",
    "security-agent.yaml"
  ]
};

export class ConfigValidationError extends Error {
  constructor(errors = [], warnings = []) {
    super("Configuration validation failed");
    this.name = "ConfigValidationError";
    this.errors = errors;
    this.warnings = warnings;
  }
}

export function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!config.security.adminToken || config.security.adminToken.length < 16) {
    errors.push("ADMIN_TOKEN missing or too short (min 16 chars)");
  }

  if (!config.ai.bsmKey || !config.ai.bsmKey.startsWith("sk-")) {
    warnings.push("OPENAI_BSM_KEY missing or invalid format; use Key Management Layer in production");
  }

  if (!fs.existsSync(config.paths.agents)) {
    errors.push(`Agents directory missing: ${config.paths.agents}`);
  } else {
    const existingAgents = fs.readdirSync(config.paths.agents).filter((f) => f.endsWith(".yaml") || f.endsWith(".md"));
    const missingAgents = config.requiredAgents.filter((req) => !existingAgents.includes(req));
    if (missingAgents.length > 0) {
      warnings.push(`Missing recommended agents: ${missingAgents.join(", ")}`);
    }
  }

  if (!fs.existsSync(config.paths.logs)) {
    fs.mkdirSync(config.paths.logs, { recursive: true });
  }

  try {
    fs.accessSync(config.paths.logs, fs.constants.W_OK);
  } catch {
    errors.push("No write permission to logs directory");
  }

  if (config.server.env === "production" && config.security.adminToken === "change-me") {
    errors.push("Default ADMIN_TOKEN used in production");
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors, warnings);
  }

  return { valid: true, errors, warnings };
}
