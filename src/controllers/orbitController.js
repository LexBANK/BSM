import { orbitAgent } from "../services/orbitAgent.js";
import { telegramNotificationService } from "../services/telegramNotificationService.js";
import { logger } from "../utils/logger.js";

/**
 * ORBIT Agent Controller
 * Handles HTTP requests for ORBIT self-healing operations
 */

/**
 * Get ORBIT agent status
 */
export const getStatus = async (req, res, next) => {
  try {
    const status = orbitAgent.getStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error("Error getting ORBIT status:", error);
    next(error);
  }
};

/**
 * Get action history
 */
export const getHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = orbitAgent.getActionHistory(limit);
    
    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    logger.error("Error getting ORBIT history:", error);
    next(error);
  }
};

/**
 * Trigger cache purge action
 */
export const purgeCache = async (req, res, next) => {
  try {
    const { zone } = req.body;
    const result = await orbitAgent.purgeCloudflareCache(zone);
    
    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    logger.error("Error purging cache:", error);
    next(error);
  }
};

/**
 * Trigger branch cleanup action
 */
export const cleanBranches = async (req, res, next) => {
  try {
    const { maxAge } = req.body;
    const result = await orbitAgent.cleanGitBranches(maxAge);
    
    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    logger.error("Error cleaning branches:", error);
    next(error);
  }
};

/**
 * Trigger health check
 */
export const healthCheck = async (req, res, next) => {
  try {
    const result = await orbitAgent.performHealthCheck();
    
    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    logger.error("Error performing health check:", error);
    next(error);
  }
};

/**
 * Trigger service restart
 */
export const restartService = async (req, res, next) => {
  try {
    const { serviceName } = req.body;
    
    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: "serviceName is required"
      });
    }
    
    const result = await orbitAgent.restartService(serviceName);
    
    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    logger.error("Error restarting service:", error);
    next(error);
  }
};

/**
 * Run a full healing cycle
 */
export const runHealingCycle = async (req, res, next) => {
  try {
    const result = await orbitAgent.runHealingCycle();
    
    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    logger.error("Error running healing cycle:", error);
    next(error);
  }
};

/**
 * Execute a custom action
 */
export const executeCustomAction = async (req, res, next) => {
  try {
    const { actionName, actionType, context } = req.body;
    
    if (!actionName) {
      return res.status(400).json({
        success: false,
        error: "actionName is required"
      });
    }
    
    // Define available action types
    const actionHandlers = {
      cache_purge: () => orbitAgent.purgeCloudflareCache(context?.zone),
      branch_cleanup: () => orbitAgent.cleanGitBranches(context?.maxAge),
      health_check: () => orbitAgent.performHealthCheck(),
      service_restart: () => orbitAgent.restartService(context?.serviceName)
    };
    
    const handler = actionHandlers[actionType];
    
    if (!handler) {
      return res.status(400).json({
        success: false,
        error: `Unknown action type: ${actionType}. Available: ${Object.keys(actionHandlers).join(", ")}`
      });
    }
    
    const result = await orbitAgent.executeCustomAction(
      actionName,
      handler,
      context
    );
    
    res.json({
      success: result.success,
      ...result
    });
  } catch (error) {
    logger.error("Error executing custom action:", error);
    next(error);
  }
};

/**
 * Test Telegram notification
 */
export const testNotification = async (req, res, next) => {
  try {
    const { message } = req.body;
    
    const testMessage = message || "Test notification from ORBIT Agent";
    
    const result = await telegramNotificationService.send(
      `🧪 *Test Notification*\n\n${testMessage}`
    );
    
    res.json({
      success: result.success,
      message: result.success 
        ? "Test notification sent successfully" 
        : "Failed to send test notification",
      details: result
    });
  } catch (error) {
    logger.error("Error testing notification:", error);
    next(error);
  }
};

/**
 * Test Telegram connection
 */
export const testConnection = async (req, res, next) => {
  try {
    const result = await telegramNotificationService.testConnection();
    
    res.json(result);
  } catch (error) {
    logger.error("Error testing connection:", error);
    next(error);
  }
};
