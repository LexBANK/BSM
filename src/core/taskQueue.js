/**
 * BSM-AgentOS Task Queue
 * Priority-based task queue with concurrency control
 */

import logger from "../utils/logger.js";

class TaskQueue {
  constructor(engine) {
    this.engine = engine;
    this.queue = []; // Array of pending tasks
    this.processing = new Map(); // executionId -> task
    this.maxConcurrent = engine.options.maxConcurrentTasks || 10;
    this.isRunning = false;
    this.processInterval = null;
  }

  /**
   * Start the task queue processor
   */
  async start() {
    if (this.isRunning) {
      logger.warn("Task Queue is already running");
      return;
    }

    this.isRunning = true;
    logger.info({ maxConcurrent: this.maxConcurrent }, "Task Queue started");

    // Start the processor loop
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 100); // Check every 100ms
  }

  /**
   * Stop the task queue processor
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn("Task Queue is not running");
      return;
    }

    this.isRunning = false;
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }

    // Wait for current tasks to complete
    if (this.processing.size > 0) {
      logger.info({ count: this.processing.size }, "Waiting for tasks to complete");
      
      const timeout = 60000; // 1 minute
      const start = Date.now();
      
      while (this.processing.size > 0 && Date.now() - start < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (this.processing.size > 0) {
        logger.warn({ count: this.processing.size }, "Force stopping pending tasks");
      }
    }

    logger.info("Task Queue stopped");
  }

  /**
   * Enqueue a task
   */
  async enqueue(task) {
    logger.debug({ taskId: task.id, priority: task.priority }, "Enqueueing task");

    // Add to queue
    this.queue.push(task);

    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);

    // Return a promise that resolves when the task completes
    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });
  }

  /**
   * Process the queue
   */
  async processQueue() {
    if (!this.isRunning) {
      return;
    }

    // Check if we can process more tasks
    while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      
      if (!task) {
        break;
      }

      // Start processing the task
      this.processTask(task);
    }
  }

  /**
   * Process a single task
   */
  async processTask(task) {
    const { id, agentId, input, metadata } = task;

    logger.info({ taskId: id, agentId }, "Processing task");

    // Mark as processing
    task.status = "running";
    task.startedAt = new Date();
    this.processing.set(id, task);

    try {
      // Execute the agent
      const result = await this.engine.agentManager.execute(agentId, input, metadata);

      // Task succeeded
      task.status = "completed";
      task.completedAt = new Date();
      task.result = result;

      this.processing.delete(id);

      if (task.resolve) {
        task.resolve(result);
      }

      logger.info({ taskId: id, duration: task.completedAt - task.startedAt }, "Task completed");
    } catch (err) {
      // Task failed
      task.status = "failed";
      task.completedAt = new Date();
      task.error = err.message;

      // Check if we should retry
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = "pending";
        this.queue.push(task);
        
        logger.warn({ taskId: id, retryCount: task.retryCount }, "Task failed, retrying");
      } else {
        this.processing.delete(id);

        if (task.reject) {
          task.reject(err);
        }

        logger.error({ err, taskId: id }, "Task failed after max retries");
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      isRunning: this.isRunning,
    };
  }

  /**
   * Get task by ID
   */
  getTask(taskId) {
    // Check processing tasks
    if (this.processing.has(taskId)) {
      return this.processing.get(taskId);
    }

    // Check queue
    return this.queue.find((t) => t.id === taskId);
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId) {
    // Check if task is in queue
    const index = this.queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      const task = this.queue.splice(index, 1)[0];
      task.status = "cancelled";
      
      if (task.reject) {
        task.reject(new Error("Task cancelled"));
      }

      logger.info({ taskId }, "Task cancelled");
      return true;
    }

    // Cannot cancel processing tasks
    if (this.processing.has(taskId)) {
      logger.warn({ taskId }, "Cannot cancel processing task");
      return false;
    }

    logger.warn({ taskId }, "Task not found");
    return false;
  }

  /**
   * Clear the queue
   */
  clear() {
    const count = this.queue.length;
    
    // Reject all pending tasks
    this.queue.forEach((task) => {
      if (task.reject) {
        task.reject(new Error("Queue cleared"));
      }
    });

    this.queue = [];
    logger.info({ count }, "Queue cleared");
  }
}

export default TaskQueue;
