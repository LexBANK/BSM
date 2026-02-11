import { auditLogger } from "../utils/auditLogger.js";
import { getAgentStates } from "../runners/orchestrator.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";
import os from "os";

/**
 * GET /api/admin/stats
 * Returns system statistics and health metrics
 * Requires ADMIN_TOKEN authentication
 */
export const getStats = async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    logger.info({ correlationId }, "Admin stats requested");

    // Get audit log statistics
    const auditStats = auditLogger.getStatistics();

    // Get agent states
    const agentStates = getAgentStates();

    // System info
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      cpus: os.cpus().length,
      hostname: os.hostname(),
      loadAverage: os.loadavg()
    };

    // Feature flags
    const features = {
      mobileMode: env.mobileMode,
      lanOnly: env.lanOnly,
      safeMode: env.safeMode,
      egressPolicy: env.egressPolicy
    };

    // Environment info (safe subset)
    const environment = {
      nodeEnv: env.nodeEnv,
      port: env.port,
      logLevel: env.logLevel,
      defaultModel: env.defaultModel,
      modelRouterStrategy: env.modelRouterStrategy,
      fallbackEnabled: env.fallbackEnabled
    };

    const stats = {
      timestamp: new Date().toISOString(),
      correlationId,
      system: systemInfo,
      features,
      environment,
      audit: auditStats,
      agents: {
        activeStates: agentStates.size,
        states: Array.from(agentStates.entries()).map(([key, value]) => ({
          key,
          ...value
        }))
      }
    };

    res.json(stats);

  } catch (err) {
    logger.error({
      correlationId,
      error: err.message
    }, "Failed to get admin stats");
    next(err);
  }
};
