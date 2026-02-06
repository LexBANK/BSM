import { logger } from "../utils/logger.js";
import { telegramNotificationService } from "./telegramNotificationService.js";

/**
 * ORBIT Self-Healing Agent
 * 
 * Operational Response and Business Intelligence Toolkit
 * 
 * A self-healing agent that monitors system health and automatically
 * performs corrective actions. All actions are logged and reported
 * via Telegram notifications.
 * 
 * Features:
 * - Automated health checks
 * - Self-healing actions (cache purging, branch cleanup, etc.)
 * - Real-time notifications via Telegram
 * - Action history tracking
 * - Extensible action registry
 */

class OrbitAgent {
  constructor() {
    this.actionHistory = [];
    this.isActive = true;
    this.lastHealthCheck = null;
    
    logger.info("ORBIT Self-Healing Agent initialized");
    this.notifyStartup();
  }

  /**
   * Notify that ORBIT has started
   */
  async notifyStartup() {
    await telegramNotificationService.sendOrbitNotification(
      "ORBIT Agent Started",
      {
        status: "Active",
        message: "Self-healing agent is now monitoring the system",
        result: "Ready for operations"
      }
    );
  }

  /**
   * Record an action in history
   * @param {string} action - Action name
   * @param {object} details - Action details
   * @param {boolean} success - Whether action succeeded
   */
  recordAction(action, details, success) {
    const record = {
      timestamp: new Date().toISOString(),
      action,
      details,
      success
    };
    
    this.actionHistory.push(record);
    
    // Keep only last 100 actions
    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }
    
    logger.info(`ORBIT action recorded: ${action}`, { success, details });
  }

  /**
   * Purge Cloudflare cache
   * Simulates cache purging action
   */
  async purgeCloudflareCache(zone = "default") {
    const action = "Cloudflare Cache Purged";
    logger.info(`ORBIT: Purging Cloudflare cache for zone: ${zone}`);
    
    try {
      // Simulate cache purge operation
      // In production, this would call Cloudflare API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const details = {
        status: "Success",
        target: `Zone: ${zone}`,
        message: "Cache successfully purged",
        result: "All cached content cleared"
      };
      
      // Send notification
      await telegramNotificationService.sendOrbitNotification(action, details);
      
      this.recordAction(action, details, true);
      
      return { success: true, action, details };
    } catch (error) {
      logger.error("ORBIT: Cache purge failed", error);
      
      const details = {
        status: "Failed",
        target: `Zone: ${zone}`,
        message: error.message,
        result: "Cache purge unsuccessful"
      };
      
      await telegramNotificationService.sendOrbitNotification(
        `${action} - FAILED`,
        details
      );
      
      this.recordAction(action, details, false);
      
      return { success: false, action, details, error: error.message };
    }
  }

  /**
   * Clean old Git branches
   * Simulates branch cleanup action
   */
  async cleanGitBranches(maxAge = 30) {
    const action = "Git Branches Cleaned";
    logger.info(`ORBIT: Cleaning branches older than ${maxAge} days`);
    
    try {
      // Simulate branch cleanup
      // In production, this would call Git/GitHub API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const branchesRemoved = Math.floor(Math.random() * 5) + 1;
      
      const details = {
        status: "Success",
        target: `Branches older than ${maxAge} days`,
        message: `Removed ${branchesRemoved} stale branches`,
        result: `Repository cleaned, ${branchesRemoved} branches deleted`
      };
      
      await telegramNotificationService.sendOrbitNotification(action, details);
      
      this.recordAction(action, details, true);
      
      return { success: true, action, details };
    } catch (error) {
      logger.error("ORBIT: Branch cleanup failed", error);
      
      const details = {
        status: "Failed",
        message: error.message,
        result: "Branch cleanup unsuccessful"
      };
      
      await telegramNotificationService.sendOrbitNotification(
        `${action} - FAILED`,
        details
      );
      
      this.recordAction(action, details, false);
      
      return { success: false, action, details, error: error.message };
    }
  }

  /**
   * Perform system health check
   */
  async performHealthCheck() {
    const action = "Health Check Completed";
    logger.info("ORBIT: Performing health check");
    
    try {
      // Simulate health check
      const healthStatus = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        uptime: process.uptime()
      };
      
      const isHealthy = 
        healthStatus.cpu < 90 && 
        healthStatus.memory < 90 && 
        healthStatus.disk < 90;
      
      const details = {
        status: isHealthy ? "Healthy" : "Warning",
        message: isHealthy 
          ? "All systems operating normally" 
          : "System resources elevated",
        result: `CPU: ${healthStatus.cpu.toFixed(1)}%, Memory: ${healthStatus.memory.toFixed(1)}%, Disk: ${healthStatus.disk.toFixed(1)}%`
      };
      
      // Only send notification if unhealthy or first check
      if (!isHealthy || !this.lastHealthCheck) {
        await telegramNotificationService.sendOrbitNotification(action, details);
      }
      
      this.lastHealthCheck = new Date().toISOString();
      this.recordAction(action, details, true);
      
      return { success: true, action, details, health: healthStatus };
    } catch (error) {
      logger.error("ORBIT: Health check failed", error);
      
      const details = {
        status: "Failed",
        message: error.message,
        result: "Unable to complete health check"
      };
      
      await telegramNotificationService.sendCriticalAlert(
        "Health check failure",
        {
          severity: "High",
          component: "ORBIT Agent",
          details: error.message
        }
      );
      
      this.recordAction(action, details, false);
      
      return { success: false, action, details, error: error.message };
    }
  }

  /**
   * Restart a service
   * Simulates service restart action
   */
  async restartService(serviceName) {
    const action = `Service Restarted: ${serviceName}`;
    logger.info(`ORBIT: Restarting service: ${serviceName}`);
    
    try {
      // Simulate service restart
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const details = {
        status: "Success",
        target: serviceName,
        message: "Service successfully restarted",
        result: "Service is now running"
      };
      
      await telegramNotificationService.sendOrbitNotification(action, details);
      
      this.recordAction(action, details, true);
      
      return { success: true, action, details };
    } catch (error) {
      logger.error(`ORBIT: Service restart failed for ${serviceName}`, error);
      
      const details = {
        status: "Failed",
        target: serviceName,
        message: error.message,
        result: "Service restart unsuccessful"
      };
      
      await telegramNotificationService.sendCriticalAlert(
        `Service restart failure: ${serviceName}`,
        {
          severity: "Critical",
          component: serviceName,
          details: error.message
        }
      );
      
      this.recordAction(action, details, false);
      
      return { success: false, action, details, error: error.message };
    }
  }

  /**
   * Trigger a custom healing action
   * @param {string} actionName - Name of the action
   * @param {Function} actionFn - Function to execute
   * @param {object} context - Action context
   */
  async executeCustomAction(actionName, actionFn, context = {}) {
    logger.info(`ORBIT: Executing custom action: ${actionName}`);
    
    try {
      const result = await actionFn(context);
      
      const details = {
        status: "Success",
        message: result.message || "Custom action completed",
        result: result.result || "Action executed successfully"
      };
      
      await telegramNotificationService.sendOrbitNotification(
        actionName,
        details
      );
      
      this.recordAction(actionName, details, true);
      
      return { success: true, action: actionName, details, result };
    } catch (error) {
      logger.error(`ORBIT: Custom action failed: ${actionName}`, error);
      
      const details = {
        status: "Failed",
        message: error.message,
        result: "Custom action unsuccessful"
      };
      
      await telegramNotificationService.sendOrbitNotification(
        `${actionName} - FAILED`,
        details
      );
      
      this.recordAction(actionName, details, false);
      
      return { success: false, action: actionName, details, error: error.message };
    }
  }

  /**
   * Get action history
   * @param {number} limit - Maximum number of records to return
   */
  getActionHistory(limit = 50) {
    return this.actionHistory.slice(-limit).reverse();
  }

  /**
   * Get ORBIT agent status
   */
  getStatus() {
    return {
      active: this.isActive,
      lastHealthCheck: this.lastHealthCheck,
      actionCount: this.actionHistory.length,
      telegramEnabled: telegramNotificationService.isEnabled(),
      uptime: process.uptime()
    };
  }

  /**
   * Run a comprehensive self-healing cycle
   */
  async runHealingCycle() {
    logger.info("ORBIT: Starting healing cycle");
    
    const results = [];
    
    // Health check
    results.push(await this.performHealthCheck());
    
    // Optional: Add more healing actions based on health status
    const lastResult = results[results.length - 1];
    if (lastResult.success && lastResult.health) {
      // If CPU is high, could trigger cache purge
      if (lastResult.health.cpu > 80) {
        results.push(await this.purgeCloudflareCache());
      }
    }
    
    return {
      success: true,
      cycleCompleted: new Date().toISOString(),
      actions: results
    };
  }
}

// Export singleton instance
export const orbitAgent = new OrbitAgent();

// Also export the class for testing
export { OrbitAgent };
