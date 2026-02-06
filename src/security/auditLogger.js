/**
 * BSM-AgentOS Audit Logger
 * Comprehensive audit logging for security and compliance
 */

import logger from "../utils/logger.js";

class AuditLogger {
  constructor(options = {}) {
    this.options = options;
    this.logs = []; // In-memory log buffer
    this.maxBufferSize = options.maxBufferSize || 10000;
    this.initialized = false;
  }

  /**
   * Initialize the audit logger
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.info("Initializing Audit Logger...");

    // In a production system, this would connect to a database
    // For now, we'll use in-memory storage

    this.initialized = true;
    logger.info("Audit Logger initialized");
  }

  /**
   * Log an audit event
   */
  async log(event) {
    if (!this.initialized) {
      throw new Error("Audit Logger is not initialized");
    }

    const auditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event,
    };

    // Add to buffer
    this.logs.push(auditEvent);

    // Keep buffer size limited
    if (this.logs.length > this.maxBufferSize) {
      this.logs.shift();
    }

    // Log to system logger
    logger.info({
      action: event.action,
      resourceType: event.resourceType,
      status: event.status,
    }, "Audit event logged");

    return auditEvent;
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by action
   */
  async getLogsByAction(action, count = 100) {
    return this.logs
      .filter((log) => log.action === action)
      .slice(-count);
  }

  /**
   * Get logs by user
   */
  async getLogsByUser(userId, count = 100) {
    return this.logs
      .filter((log) => log.userId === userId)
      .slice(-count);
  }

  /**
   * Get logs by resource
   */
  async getLogsByResource(resourceType, resourceId, count = 100) {
    return this.logs
      .filter((log) => log.resourceType === resourceType && log.resourceId === resourceId)
      .slice(-count);
  }

  /**
   * Get logs by date range
   */
  async getLogsByDateRange(startDate, endDate) {
    return this.logs.filter((log) => {
      return log.timestamp >= startDate && log.timestamp <= endDate;
    });
  }

  /**
   * Get audit statistics
   */
  async getStats() {
    const stats = {
      total: this.logs.length,
      byAction: {},
      byResourceType: {},
      byStatus: {},
    };

    this.logs.forEach((log) => {
      // Count by action
      if (!stats.byAction[log.action]) {
        stats.byAction[log.action] = 0;
      }
      stats.byAction[log.action]++;

      // Count by resource type
      if (!stats.byResourceType[log.resourceType]) {
        stats.byResourceType[log.resourceType] = 0;
      }
      stats.byResourceType[log.resourceType]++;

      // Count by status
      if (!stats.byStatus[log.status]) {
        stats.byStatus[log.status] = 0;
      }
      stats.byStatus[log.status]++;
    });

    return stats;
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(olderThan) {
    const before = this.logs.length;
    this.logs = this.logs.filter((log) => log.timestamp > olderThan);
    const after = this.logs.length;
    
    logger.info({ removed: before - after }, "Old audit logs cleared");
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      totalLogs: this.logs.length,
      bufferSize: this.maxBufferSize,
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    // In a production system, this would flush logs to persistent storage
    logger.info({ count: this.logs.length }, "Audit Logger shutting down");

    this.logs = [];
    this.initialized = false;

    logger.info("Audit Logger shut down");
  }
}

export default AuditLogger;
