/**
 * BSM-AgentOS Event Bus
 * Central event system for inter-component communication
 */

import EventEmitter from "events";
import logger from "../utils/logger.js";

class EventBus extends EventEmitter {
  constructor(engine) {
    super();
    this.engine = engine;
    this.eventLog = []; // Store recent events for debugging
    this.maxLogSize = 1000;
    this.isRunning = false;

    // Set max listeners to avoid warnings
    this.setMaxListeners(100);
  }

  /**
   * Start the event bus
   */
  async start() {
    if (this.isRunning) {
      logger.warn("Event Bus is already running");
      return;
    }

    this.isRunning = true;
    logger.info("Event Bus started");

    // Register core event handlers
    this.registerCoreHandlers();
  }

  /**
   * Stop the event bus
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn("Event Bus is not running");
      return;
    }

    this.isRunning = false;
    this.removeAllListeners();
    this.eventLog = [];

    logger.info("Event Bus stopped");
  }

  /**
   * Emit an event and log it
   */
  emit(event, data) {
    if (!this.isRunning) {
      logger.warn({ event }, "Event Bus is not running, event not emitted");
      return false;
    }

    // Log the event
    const eventRecord = {
      event,
      data,
      timestamp: new Date(),
    };

    this.eventLog.push(eventRecord);

    // Keep log size limited
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    logger.debug({ event }, "Event emitted");

    // Emit the event
    return super.emit(event, data);
  }

  /**
   * Register core system event handlers
   */
  registerCoreHandlers() {
    // Task events
    this.on("task.created", (task) => {
      logger.debug({ taskId: task.id }, "Task created event");
    });

    this.on("task.completed", (data) => {
      logger.debug({ taskId: data.id, duration: data.duration }, "Task completed event");
    });

    this.on("task.failed", (data) => {
      logger.error({ taskId: data.taskId, error: data.error }, "Task failed event");
    });

    // Agent events
    this.on("agent.registered", (agent) => {
      logger.info({ agentId: agent.id, name: agent.name }, "Agent registered event");
    });

    this.on("agent.unregistered", (agent) => {
      logger.info({ agentId: agent.id }, "Agent unregistered event");
    });

    this.on("agent.executed", (data) => {
      logger.debug({ agentId: data.agent.id, duration: data.execution.duration }, "Agent executed event");
    });

    this.on("agent.executionFailed", (data) => {
      logger.error({ agentId: data.agent.id, error: data.error.message }, "Agent execution failed event");
    });

    // Engine events
    this.on("engine.started", () => {
      logger.info("Engine started event");
    });

    this.on("engine.stopped", () => {
      logger.info("Engine stopped event");
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 100) {
    return this.eventLog.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType, count = 100) {
    return this.eventLog
      .filter((e) => e.event === eventType)
      .slice(-count);
  }

  /**
   * Clear event log
   */
  clearLog() {
    const count = this.eventLog.length;
    this.eventLog = [];
    logger.info({ count }, "Event log cleared");
  }

  /**
   * Subscribe to multiple events
   */
  subscribe(events, handler) {
    if (Array.isArray(events)) {
      events.forEach((event) => this.on(event, handler));
    } else {
      this.on(events, handler);
    }
  }

  /**
   * Unsubscribe from multiple events
   */
  unsubscribe(events, handler) {
    if (Array.isArray(events)) {
      events.forEach((event) => this.off(event, handler));
    } else {
      this.off(events, handler);
    }
  }

  /**
   * Get event statistics
   */
  getStats() {
    const stats = {};
    
    this.eventLog.forEach((record) => {
      if (!stats[record.event]) {
        stats[record.event] = 0;
      }
      stats[record.event]++;
    });

    return {
      totalEvents: this.eventLog.length,
      eventCounts: stats,
      oldestEvent: this.eventLog[0]?.timestamp,
      newestEvent: this.eventLog[this.eventLog.length - 1]?.timestamp,
    };
  }
}

export default EventBus;
