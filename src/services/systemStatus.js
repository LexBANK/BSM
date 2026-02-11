import { env } from "../config/env.js";
import { agentStateService } from "./agentStateService.js";
import { auditLogger } from "../utils/auditLogger.js";
import fs from "fs";
import path from "path";

/**
 * System Status Service
 * Tracks system uptime, health, and operational status
 */

class SystemStatusService {
  constructor() {
    this.startTime = Date.now();
    this.errorLog = [];
    this.maxErrors = 50; // Keep last 50 errors
    this.executionHistory = [];
    this.maxHistory = 20; // Keep last 20 executions
  }

  /**
   * Get system uptime in seconds
   */
  getUptimeSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get formatted uptime string
   */
  getUptimeFormatted() {
    const seconds = this.getUptimeSeconds();
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    const agentStates = agentStateService.getAllAgentsStatus();
    const runningAgents = Object.values(agentStates).filter(s => s.status === "running").length;
    const totalAgents = Object.keys(agentStates).length;

    return {
      status: "operational",
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: this.getUptimeSeconds(),
        formatted: this.getUptimeFormatted(),
        startTime: new Date(this.startTime).toISOString()
      },
      environment: env.nodeEnv,
      version: "1.0.0",
      modes: {
        mobile: env.mobileMode,
        lan: env.lanOnly,
        safe: env.safeMode
      },
      agents: {
        total: totalAgents,
        running: runningAgents,
        stopped: totalAgents - runningAgents
      },
      errors: {
        recent: this.errorLog.length,
        last24h: this.getErrorCount24h()
      }
    };
  }

  /**
   * Get current operating modes
   */
  getModes() {
    return {
      mobileMode: env.mobileMode,
      lanOnly: env.lanOnly,
      safeMode: env.safeMode,
      egressPolicy: env.egressPolicy,
      restrictions: this.getActiveRestrictions()
    };
  }

  /**
   * Get active restrictions based on modes
   */
  getActiveRestrictions() {
    const restrictions = [];
    
    if (env.mobileMode) {
      restrictions.push("write_operations_disabled");
      restrictions.push("agent_execution_restricted");
      restrictions.push("admin_access_disabled");
    }
    
    if (env.lanOnly) {
      restrictions.push("lan_only_access");
    }
    
    if (env.safeMode) {
      restrictions.push("external_api_disabled");
      restrictions.push("agent_execution_disabled");
    }

    if (env.egressPolicy === "deny_all") {
      restrictions.push("all_egress_blocked");
    } else if (env.egressPolicy === "deny_by_default") {
      restrictions.push("egress_whitelist_only");
    }

    return restrictions;
  }

  /**
   * Log an error
   */
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      code: error.code,
      context
    };

    this.errorLog.unshift(errorEntry);
    
    // Keep only recent errors
    if (this.errorLog.length > this.maxErrors) {
      this.errorLog = this.errorLog.slice(0, this.maxErrors);
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(0, limit);
  }

  /**
   * Get error count in last 24 hours
   */
  getErrorCount24h() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.errorLog.filter(e => {
      const errorTime = new Date(e.timestamp).getTime();
      return errorTime > oneDayAgo;
    }).length;
  }

  /**
   * Record agent execution
   */
  recordExecution(agentId, result, context = {}) {
    const execution = {
      timestamp: new Date().toISOString(),
      agentId,
      success: result.success,
      duration: result.duration,
      actor: context.actor || "unknown",
      mode: context.mode || "unknown"
    };

    this.executionHistory.unshift(execution);
    
    // Keep only recent history
    if (this.executionHistory.length > this.maxHistory) {
      this.executionHistory = this.executionHistory.slice(0, this.maxHistory);
    }
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 10) {
    return this.executionHistory.slice(0, limit);
  }

  /**
   * Get last execution
   */
  getLastExecution() {
    return this.executionHistory[0] || null;
  }

  /**
   * Get agent execution queue (placeholder for future implementation)
   */
  getExecutionQueue() {
    // TODO: Implement actual queue when agent execution pipeline is built
    return {
      pending: [],
      running: [],
      message: "Queue system not yet implemented"
    };
  }

  /**
   * Get audit log summary
   */
  getAuditSummary() {
    try {
      const stats = auditLogger.getStatistics();
      const recentLogs = auditLogger.readLogs({ limit: 10 });
      
      return {
        totalEntries: stats.totalEntries,
        eventBreakdown: stats.events,
        recentEntries: recentLogs.length,
        logPath: stats.logPath
      };
    } catch (error) {
      return {
        error: "Failed to read audit logs",
        message: error.message
      };
    }
  }

  /**
   * Get health check status
   */
  getHealthStatus() {
    const uptime = this.getUptimeSeconds();
    const recentErrors = this.getErrorCount24h();
    
    let health = "healthy";
    if (recentErrors > 50) {
      health = "unhealthy";
    } else if (recentErrors > 10) {
      health = "degraded";
    }

    return {
      health,
      uptime: uptime,
      errors24h: recentErrors,
      operational: health !== "unhealthy"
    };
  }
}

// Export singleton instance
export const systemStatusService = new SystemStatusService();
