/**
 * BSM-AgentOS Core Engine
 * Central orchestration and coordination engine for the multi-agent system
 */

import EventEmitter from "events";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";
import AgentManager from "./agentManager.js";
import TaskQueue from "./taskQueue.js";
import EventBus from "./eventBus.js";

class CoreEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      maxConcurrentTasks: options.maxConcurrentTasks || 10,
      taskTimeout: options.taskTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      ...options,
    };

    this.agentManager = new AgentManager(this);
    this.taskQueue = new TaskQueue(this);
    this.eventBus = new EventBus(this);
    
    this.status = "stopped"; // stopped, starting, running, stopping
    this.metrics = {
      tasksProcessed: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
      averageTaskTime: 0,
    };

    logger.info({ options: this.options }, "Core Engine initialized");
  }

  /**
   * Start the core engine
   */
  async start() {
    if (this.status === "running") {
      logger.warn("Core Engine is already running");
      return;
    }

    this.status = "starting";
    logger.info("Starting Core Engine...");

    try {
      // Initialize managers
      await this.agentManager.initialize();
      await this.taskQueue.start();
      await this.eventBus.start();

      this.status = "running";
      this.emit("started");
      logger.info("Core Engine started successfully");
    } catch (err) {
      this.status = "stopped";
      logger.error({ err }, "Failed to start Core Engine");
      throw err;
    }
  }

  /**
   * Stop the core engine
   */
  async stop() {
    if (this.status !== "running") {
      logger.warn({ status: this.status }, "Core Engine is not running");
      return;
    }

    this.status = "stopping";
    logger.info("Stopping Core Engine...");

    try {
      await this.taskQueue.stop();
      await this.eventBus.stop();
      await this.agentManager.shutdown();

      this.status = "stopped";
      this.emit("stopped");
      logger.info("Core Engine stopped successfully");
    } catch (err) {
      logger.error({ err }, "Error stopping Core Engine");
      throw err;
    }
  }

  /**
   * Execute a task with an agent
   */
  async executeTask(taskConfig) {
    const taskId = uuidv4();
    const startTime = Date.now();

    logger.info({ taskId, agentId: taskConfig.agentId }, "Executing task");

    try {
      // Validate task config
      if (!taskConfig.agentId) {
        throw new Error("agentId is required");
      }
      if (!taskConfig.input) {
        throw new Error("input is required");
      }

      // Create task
      const task = {
        id: taskId,
        agentId: taskConfig.agentId,
        type: taskConfig.type || "execute",
        priority: taskConfig.priority || 5,
        input: taskConfig.input,
        metadata: taskConfig.metadata || {},
        status: "pending",
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: taskConfig.maxRetries || this.options.retryAttempts,
      };

      // Emit task created event
      this.eventBus.emit("task.created", task);

      // Queue the task
      const result = await this.taskQueue.enqueue(task);

      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(true, duration);

      // Emit task completed event
      this.eventBus.emit("task.completed", { ...task, result, duration });

      logger.info({ taskId, duration }, "Task completed successfully");
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      this.updateMetrics(false, duration);

      // Emit task failed event
      this.eventBus.emit("task.failed", { taskId, error: err.message, duration });

      logger.error({ err, taskId, duration }, "Task execution failed");
      throw err;
    }
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeBatch(tasks) {
    logger.info({ count: tasks.length }, "Executing task batch");
    
    const results = await Promise.allSettled(
      tasks.map((task) => this.executeTask(task))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    logger.info({ total: tasks.length, succeeded, failed }, "Batch execution completed");
    
    return results;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId) {
    return await this.agentManager.getAgent(agentId);
  }

  /**
   * List all agents
   */
  async listAgents(filters = {}) {
    return await this.agentManager.listAgents(filters);
  }

  /**
   * Register a new agent
   */
  async registerAgent(agentConfig) {
    return await this.agentManager.registerAgent(agentConfig);
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId) {
    return await this.agentManager.unregisterAgent(agentId);
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      status: this.status,
      metrics: this.metrics,
      queue: this.taskQueue.getStatus(),
      agents: this.agentManager.getStatus(),
      uptime: process.uptime(),
    };
  }

  /**
   * Update engine metrics
   */
  updateMetrics(success, duration) {
    this.metrics.tasksProcessed++;
    if (success) {
      this.metrics.tasksSucceeded++;
    } else {
      this.metrics.tasksFailed++;
    }

    // Update average task time
    const total = this.metrics.tasksProcessed;
    const current = this.metrics.averageTaskTime;
    this.metrics.averageTaskTime = (current * (total - 1) + duration) / total;
  }

  /**
   * Subscribe to engine events
   */
  subscribe(event, handler) {
    this.eventBus.on(event, handler);
  }

  /**
   * Unsubscribe from engine events
   */
  unsubscribe(event, handler) {
    this.eventBus.off(event, handler);
  }
}

// Singleton instance
let engineInstance = null;

export function getEngine(options = {}) {
  if (!engineInstance) {
    engineInstance = new CoreEngine(options);
  }
  return engineInstance;
}

export default CoreEngine;
