import express from "express";
import { env } from "../config/env.js";
import { isMobileClient } from "../middleware/mobileMode.js";
import logger from "../utils/logger.js";
import { getSystemStatus } from "../status/systemStatus.js";

const router = express.Router();

/**
 * GET /api/status
 * Unified system status endpoint
 * Returns operational mode, feature flags, and system health
 */
router.get("/status", (req, res) => {
  try {
    const isMobile = isMobileClient(req);
    const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Get real system status from provider
    const systemStatus = getSystemStatus();
    
    const status = {
      status: systemStatus.ok ? "operational" : "degraded",
      timestamp: systemStatus.timestamp,
      environment: systemStatus.environment,
      version: "1.0.0",
      
      // Real system metrics
      system: {
        agents: systemStatus.agents,
        uptime: systemStatus.uptime
      },
      
      // Feature flags (visible to clients)
      features: {
        mobileMode: systemStatus.mobileMode,
        lanOnly: systemStatus.lanOnly,
        safeMode: systemStatus.safeMode
      },
      
      // Client detection
      client: {
        isMobile,
        ip: clientIp,
        restrictions: []
      },
      
      // Service capabilities
      capabilities: {
        chat: true,
        agents: !systemStatus.safeMode,
        admin: !systemStatus.mobileMode,
        externalApi: !systemStatus.safeMode
      }
    };
    
    // Add error information if system status is degraded
    if (!systemStatus.ok && systemStatus.error) {
      status.error = systemStatus.error;
    }
    
    // Add restriction information for mobile clients
    if (systemStatus.mobileMode && isMobile) {
      status.client.restrictions.push("write_operations_disabled");
      status.client.restrictions.push("agent_execution_disabled");
      status.client.restrictions.push("admin_access_disabled");
    }
    
    // Add LAN-only information
    if (systemStatus.lanOnly) {
      status.client.restrictions.push("lan_only_access");
    }
    
    logger.debug({
      correlationId: req.correlationId,
      clientIp,
      isMobile,
      agents: systemStatus.agents,
      uptime: systemStatus.uptime
    }, "Status check");
    
    res.json(status);
  } catch (error) {
    logger.error({
      error: error.message,
      correlationId: req.correlationId
    }, "Status endpoint error");
    
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve status"
    });
  }
});

/**
 * GET /api/health (legacy compatibility)
 * Simple health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

export default router;
