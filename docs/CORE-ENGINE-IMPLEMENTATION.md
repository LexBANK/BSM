# BSM Core Engine Implementation

> **Component**: Core Engine  
> **Priority**: 🔴 CRITICAL  
> **Dependencies**: Database Layer, Redis Cache

---

## Overview

The BSM Core Engine is the heart of the AgentOS platform. It orchestrates agent lifecycles, manages task execution, handles events, and provides a plugin system for extensibility.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Core Engine                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Engine Orchestrator                       │  │
│  │  - Initialize all subsystems                         │  │
│  │  - Coordinate component interactions                 │  │
│  │  - Handle graceful shutdown                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│   ┌────────────────┬───────┴────────┬──────────────────┐   │
│   │                │                │                   │   │
│   ▼                ▼                ▼                   ▼   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Agent   │  │   Task   │  │  Event   │  │  Plugin  │  │
│  │ Manager  │  │  Queue   │  │   Bus    │  │  System  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component 1: Engine Orchestrator

### File: `src/core/engine.js`

```javascript
import { AgentManager } from './agentManager.js';
import { TaskQueue } from './taskQueue.js';
import { EventBus } from './eventBus.js';
import { PluginSystem } from './pluginSystem.js';
import { WorkflowEngine } from './workflowEngine.js';
import { testConnection, closePool } from '../database/connection.js';
import { cache } from '../database/cache.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Core Engine - Orchestrates all BSM-AgentOS subsystems
 */
export class CoreEngine {
  constructor(config = {}) {
    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 10,
      taskPollInterval: config.taskPollInterval || 5000,
      enablePlugins: config.enablePlugins !== false,
      enableWorkflows: config.enableWorkflows !== false,
      ...config
    };

    this.agentManager = null;
    this.taskQueue = null;
    this.eventBus = null;
    this.pluginSystem = null;
    this.workflowEngine = null;
    
    this.isInitialized = false;
    this.isRunning = false;
  }

  /**
   * Initialize the core engine and all subsystems
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Core engine already initialized');
      return;
    }

    try {
      logger.info('Initializing BSM Core Engine...');

      // 1. Test database connection
      logger.info('Testing database connection...');
      const dbConnected = await testConnection();
      if (!dbConnected) {
        throw new AppError('Database connection failed', 500, 'DB_CONNECTION_FAILED');
      }

      // 2. Connect to Redis cache
      logger.info('Connecting to Redis cache...');
      await cache.connect();

      // 3. Initialize Event Bus (required by other components)
      logger.info('Initializing Event Bus...');
      this.eventBus = new EventBus();
      await this.eventBus.initialize();

      // 4. Initialize Agent Manager
      logger.info('Initializing Agent Manager...');
      this.agentManager = new AgentManager({
        eventBus: this.eventBus,
        cache
      });
      await this.agentManager.initialize();

      // 5. Initialize Task Queue
      logger.info('Initializing Task Queue...');
      this.taskQueue = new TaskQueue({
        eventBus: this.eventBus,
        agentManager: this.agentManager,
        maxConcurrent: this.config.maxConcurrentTasks,
        pollInterval: this.config.taskPollInterval
      });
      await this.taskQueue.initialize();

      // 6. Initialize Plugin System (optional)
      if (this.config.enablePlugins) {
        logger.info('Initializing Plugin System...');
        this.pluginSystem = new PluginSystem({
          eventBus: this.eventBus,
          agentManager: this.agentManager
        });
        await this.pluginSystem.initialize();
        await this.pluginSystem.loadPlugins();
      }

      // 7. Initialize Workflow Engine (optional)
      if (this.config.enableWorkflows) {
        logger.info('Initializing Workflow Engine...');
        this.workflowEngine = new WorkflowEngine({
          eventBus: this.eventBus,
          agentManager: this.agentManager,
          taskQueue: this.taskQueue
        });
        await this.workflowEngine.initialize();
      }

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('✅ Core Engine initialized successfully');
      
      // Emit initialization event
      this.eventBus.emit('engine:initialized', { timestamp: Date.now() });
      
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Core Engine');
      throw error;
    }
  }

  /**
   * Start the core engine
   */
  async start() {
    if (!this.isInitialized) {
      throw new AppError('Engine not initialized', 500, 'ENGINE_NOT_INITIALIZED');
    }

    if (this.isRunning) {
      logger.warn('Core engine already running');
      return;
    }

    try {
      logger.info('Starting Core Engine...');

      // Start task queue processing
      await this.taskQueue.start();

      // Start workflow engine if enabled
      if (this.workflowEngine) {
        await this.workflowEngine.start();
      }

      this.isRunning = true;
      logger.info('✅ Core Engine started successfully');
      
      // Emit start event
      this.eventBus.emit('engine:started', { timestamp: Date.now() });
      
    } catch (error) {
      logger.error({ error }, 'Failed to start Core Engine');
      throw error;
    }
  }

  /**
   * Stop the core engine gracefully
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn('Core engine not running');
      return;
    }

    try {
      logger.info('Stopping Core Engine...');

      // Stop workflow engine
      if (this.workflowEngine) {
        await this.workflowEngine.stop();
      }

      // Stop task queue processing
      await this.taskQueue.stop();

      // Close connections
      await cache.disconnect();
      await closePool();

      this.isRunning = false;
      logger.info('✅ Core Engine stopped successfully');
      
      // Emit stop event
      this.eventBus.emit('engine:stopped', { timestamp: Date.now() });
      
    } catch (error) {
      logger.error({ error }, 'Error stopping Core Engine');
      throw error;
    }
  }

  /**
   * Setup event handlers for cross-component communication
   */
  setupEventHandlers() {
    // Agent lifecycle events
    this.eventBus.on('agent:created', (data) => {
      logger.info({ agentId: data.agentId }, 'Agent created');
    });

    this.eventBus.on('agent:deleted', (data) => {
      logger.info({ agentId: data.agentId }, 'Agent deleted');
    });

    // Task lifecycle events
    this.eventBus.on('task:created', (data) => {
      logger.info({ taskId: data.taskId }, 'Task created');
    });

    this.eventBus.on('task:completed', (data) => {
      logger.info({ taskId: data.taskId, status: data.status }, 'Task completed');
    });

    this.eventBus.on('task:failed', (data) => {
      logger.error({ taskId: data.taskId, error: data.error }, 'Task failed');
    });

    // Plugin events
    if (this.pluginSystem) {
      this.eventBus.on('plugin:loaded', (data) => {
        logger.info({ plugin: data.name }, 'Plugin loaded');
      });
    }

    // Error events
    this.eventBus.on('error', (data) => {
      logger.error({ error: data.error }, 'Engine error event');
    });
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      components: {
        agentManager: this.agentManager?.getStatus() || null,
        taskQueue: this.taskQueue?.getStatus() || null,
        eventBus: this.eventBus?.getStatus() || null,
        pluginSystem: this.pluginSystem?.getStatus() || null,
        workflowEngine: this.workflowEngine?.getStatus() || null
      },
      config: {
        maxConcurrentTasks: this.config.maxConcurrentTasks,
        enablePlugins: this.config.enablePlugins,
        enableWorkflows: this.config.enableWorkflows
      }
    };
  }

  /**
   * Get engine metrics
   */
  async getMetrics() {
    return {
      agents: await this.agentManager.getMetrics(),
      tasks: await this.taskQueue.getMetrics(),
      events: this.eventBus.getMetrics(),
      workflows: this.workflowEngine ? await this.workflowEngine.getMetrics() : null
    };
  }
}

// Singleton instance
let engineInstance = null;

/**
 * Get the singleton Core Engine instance
 */
export const getEngine = (config) => {
  if (!engineInstance) {
    engineInstance = new CoreEngine(config);
  }
  return engineInstance;
};

/**
 * Initialize and start the Core Engine
 */
export const initializeEngine = async (config) => {
  const engine = getEngine(config);
  await engine.initialize();
  await engine.start();
  return engine;
};
```

---

## Component 2: Agent Manager

### File: `src/core/agentManager.js`

```javascript
import { AgentRepository } from '../database/repositories/agentRepository.js';
import { CacheService } from '../services/cacheService.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Agent Manager - Manages agent lifecycle and operations
 */
export class AgentManager {
  constructor({ eventBus, cache }) {
    this.eventBus = eventBus;
    this.cache = cache;
    this.agents = new Map(); // In-memory cache of active agents
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Agent Manager...');
      
      // Load active agents from database
      const activeAgents = await AgentRepository.findActive();
      
      activeAgents.forEach(agent => {
        this.agents.set(agent.agentId, agent);
      });

      logger.info({ count: activeAgents.length }, 'Loaded active agents');
      
      this.initialized = true;
      this.eventBus.emit('agentManager:initialized', {
        agentCount: activeAgents.length
      });
      
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Agent Manager');
      throw error;
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(agentData) {
    try {
      // Validate agent data
      this.validateAgentData(agentData);

      // Create in database
      const agent = await AgentRepository.create(agentData);

      // Add to memory
      this.agents.set(agent.agentId, agent);

      // Invalidate cache
      await CacheService.invalidateAgent(agent.id);

      // Emit event
      this.eventBus.emit('agent:created', {
        agentId: agent.agentId,
        name: agent.name
      });

      logger.info({ agentId: agent.agentId }, 'Agent created');
      return agent;
      
    } catch (error) {
      logger.error({ error, agentData }, 'Failed to create agent');
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId) {
    try {
      // Try memory cache first
      if (this.agents.has(agentId)) {
        return this.agents.get(agentId);
      }

      // Try Redis cache
      const cached = await CacheService.getAgent(agentId);
      if (cached) {
        this.agents.set(agentId, cached);
        return cached;
      }

      // Fetch from database
      const agent = await AgentRepository.findByAgentId(agentId);
      
      // Update caches
      this.agents.set(agentId, agent);
      await CacheService.setAgent(agent.id, agent);

      return agent;
      
    } catch (error) {
      logger.error({ error, agentId }, 'Failed to get agent');
      throw error;
    }
  }

  /**
   * Update agent
   */
  async updateAgent(agentId, updates) {
    try {
      const agent = await this.getAgent(agentId);
      const updated = await AgentRepository.update(agent.id, updates);

      // Update memory cache
      this.agents.set(agentId, updated);

      // Invalidate Redis cache
      await CacheService.invalidateAgent(agent.id);

      // Emit event
      this.eventBus.emit('agent:updated', {
        agentId: updated.agentId,
        updates
      });

      logger.info({ agentId }, 'Agent updated');
      return updated;
      
    } catch (error) {
      logger.error({ error, agentId }, 'Failed to update agent');
      throw error;
    }
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId) {
    try {
      const agent = await this.getAgent(agentId);
      await AgentRepository.delete(agent.id);

      // Remove from memory
      this.agents.delete(agentId);

      // Invalidate cache
      await CacheService.invalidateAgent(agent.id);

      // Emit event
      this.eventBus.emit('agent:deleted', { agentId });

      logger.info({ agentId }, 'Agent deleted');
      
    } catch (error) {
      logger.error({ error, agentId }, 'Failed to delete agent');
      throw error;
    }
  }

  /**
   * List all agents
   */
  async listAgents(filters = {}) {
    try {
      const agents = await AgentRepository.findAll(filters);
      return agents;
    } catch (error) {
      logger.error({ error }, 'Failed to list agents');
      throw error;
    }
  }

  /**
   * Get agent capabilities
   */
  async getAgentCapabilities(agentId) {
    const agent = await this.getAgent(agentId);
    return agent.capabilities || [];
  }

  /**
   * Check if agent can perform action
   */
  async canPerformAction(agentId, action) {
    const agent = await this.getAgent(agentId);
    const allowedActions = new Set(agent.actions || []);
    return allowedActions.has(action);
  }

  /**
   * Execute agent action
   */
  async executeAgent(agentId, input) {
    try {
      const agent = await this.getAgent(agentId);

      if (agent.status !== 'active') {
        throw new AppError('Agent is not active', 400, 'AGENT_NOT_ACTIVE');
      }

      // Emit execution start event
      this.eventBus.emit('agent:execution:started', {
        agentId,
        timestamp: Date.now()
      });

      // TODO: Integrate with actual agent execution logic
      // This will be handled by the existing agentRunner

      logger.info({ agentId }, 'Agent execution initiated');
      
    } catch (error) {
      logger.error({ error, agentId }, 'Agent execution failed');
      throw error;
    }
  }

  /**
   * Validate agent data
   */
  validateAgentData(data) {
    if (!data.agentId) {
      throw new AppError('Agent ID is required', 400, 'INVALID_AGENT_DATA');
    }
    if (!data.name) {
      throw new AppError('Agent name is required', 400, 'INVALID_AGENT_DATA');
    }
    if (!data.role) {
      throw new AppError('Agent role is required', 400, 'INVALID_AGENT_DATA');
    }
  }

  /**
   * Get agent manager status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      activeAgents: this.agents.size,
      agents: Array.from(this.agents.keys())
    };
  }

  /**
   * Get agent metrics
   */
  async getMetrics() {
    const total = await AgentRepository.findAll();
    const active = await AgentRepository.findActive();

    return {
      total: total.length,
      active: active.length,
      inactive: total.length - active.length,
      byType: this.getAgentsByType(),
      memoryCache: this.agents.size
    };
  }

  /**
   * Get agents grouped by type
   */
  getAgentsByType() {
    const byType = {};
    this.agents.forEach(agent => {
      const type = agent.role || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    return byType;
  }
}
```

---

## Component 3: Task Queue

### File: `src/core/taskQueue.js`

```javascript
import { Task } from '../database/models/Task.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Task Queue - Manages task scheduling and execution
 */
export class TaskQueue {
  constructor({ eventBus, agentManager, maxConcurrent = 10, pollInterval = 5000 }) {
    this.eventBus = eventBus;
    this.agentManager = agentManager;
    this.maxConcurrent = maxConcurrent;
    this.pollInterval = pollInterval;
    
    this.runningTasks = new Map();
    this.isProcessing = false;
    this.pollTimer = null;
    this.initialized = false;
  }

  async initialize() {
    logger.info('Initializing Task Queue...');
    
    // Recovery: Check for tasks that were running when system went down
    await this.recoverInterruptedTasks();
    
    this.initialized = true;
    this.eventBus.emit('taskQueue:initialized', {});
  }

  /**
   * Start processing tasks
   */
  async start() {
    if (this.isProcessing) {
      logger.warn('Task queue already processing');
      return;
    }

    logger.info('Starting task queue processing...');
    this.isProcessing = true;
    
    // Start polling for pending tasks
    this.pollTimer = setInterval(() => {
      this.processPendingTasks().catch(err => {
        logger.error({ err }, 'Error processing pending tasks');
      });
    }, this.pollInterval);

    // Process immediately
    await this.processPendingTasks();
  }

  /**
   * Stop processing tasks
   */
  async stop() {
    if (!this.isProcessing) {
      return;
    }

    logger.info('Stopping task queue processing...');
    this.isProcessing = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for running tasks to complete
    await this.waitForRunningTasks();
  }

  /**
   * Add a new task to the queue
   */
  async enqueueTask(taskData) {
    try {
      const task = await Task.create(taskData);
      
      this.eventBus.emit('task:created', {
        taskId: task.taskId,
        agentId: task.agentId,
        type: task.type
      });

      logger.info({ taskId: task.taskId }, 'Task enqueued');
      
      // Try to process immediately if capacity available
      if (this.runningTasks.size < this.maxConcurrent) {
        setImmediate(() => this.processPendingTasks());
      }

      return task;
    } catch (error) {
      logger.error({ error, taskData }, 'Failed to enqueue task');
      throw error;
    }
  }

  /**
   * Process pending tasks
   */
  async processPendingTasks() {
    if (!this.isProcessing) {
      return;
    }

    try {
      // Check how many slots are available
      const availableSlots = this.maxConcurrent - this.runningTasks.size;
      if (availableSlots <= 0) {
        return; // Queue is full
      }

      // Fetch pending tasks ordered by priority
      const pendingTasks = await Task.findByStatus('pending', availableSlots);
      
      if (pendingTasks.length === 0) {
        return;
      }

      logger.info({ count: pendingTasks.length }, 'Processing pending tasks');

      // Execute tasks
      for (const task of pendingTasks) {
        await this.executeTask(task);
      }
      
    } catch (error) {
      logger.error({ error }, 'Error in processPendingTasks');
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task) {
    try {
      // Mark as running
      await task.updateStatus('running');
      this.runningTasks.set(task.id, task);

      this.eventBus.emit('task:started', {
        taskId: task.taskId,
        agentId: task.agentId
      });

      // Execute asynchronously
      this.runTaskAsync(task).catch(err => {
        logger.error({ err, taskId: task.taskId }, 'Task execution error');
      });

    } catch (error) {
      logger.error({ error, taskId: task.taskId }, 'Failed to execute task');
      await this.handleTaskFailure(task, error);
    }
  }

  /**
   * Run task asynchronously
   */
  async runTaskAsync(task) {
    const startTime = Date.now();
    
    try {
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeoutSeconds * 1000);
      });

      // Get agent
      const agent = await this.agentManager.getAgent(task.agentId);

      // Execute task (integrate with existing agentRunner)
      const executionPromise = this.executeAgentTask(agent, task);

      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Task completed successfully
      const executionTime = Date.now() - startTime;
      await task.updateStatus('completed', { output: result });

      this.runningTasks.delete(task.id);

      this.eventBus.emit('task:completed', {
        taskId: task.taskId,
        agentId: task.agentId,
        executionTime,
        status: 'success'
      });

      logger.info({ taskId: task.taskId, executionTime }, 'Task completed');

    } catch (error) {
      await this.handleTaskFailure(task, error);
    }
  }

  /**
   * Execute agent task (to be integrated with existing agentRunner)
   */
  async executeAgentTask(agent, task) {
    // TODO: Integrate with src/runners/agentRunner.js
    // For now, this is a placeholder
    logger.info({ agentId: agent.agentId, taskId: task.taskId }, 'Executing agent task');
    
    // Simulate execution
    return { success: true, message: 'Task executed' };
  }

  /**
   * Handle task failure
   */
  async handleTaskFailure(task, error) {
    const executionTime = Date.now() - new Date(task.startedAt).getTime();
    
    this.runningTasks.delete(task.id);

    // Check if we can retry
    if (task.canRetry()) {
      await task.incrementRetry();
      await task.updateStatus('pending', { error: error.message });
      
      logger.warn({ taskId: task.taskId, retryCount: task.retryCount }, 'Task will be retried');
      
      this.eventBus.emit('task:retry', {
        taskId: task.taskId,
        retryCount: task.retryCount
      });
    } else {
      await task.updateStatus('failed', { error: error.message });
      
      logger.error({ taskId: task.taskId, error: error.message }, 'Task failed');
      
      this.eventBus.emit('task:failed', {
        taskId: task.taskId,
        agentId: task.agentId,
        error: error.message,
        executionTime
      });
    }
  }

  /**
   * Recover tasks that were interrupted
   */
  async recoverInterruptedTasks() {
    try {
      const runningTasks = await Task.findByStatus('running');
      
      if (runningTasks.length === 0) {
        return;
      }

      logger.info({ count: runningTasks.length }, 'Recovering interrupted tasks');

      for (const task of runningTasks) {
        // Reset to pending so they can be retried
        await task.updateStatus('pending', {
          error: 'Task interrupted by system restart'
        });
      }
    } catch (error) {
      logger.error({ error }, 'Failed to recover interrupted tasks');
    }
  }

  /**
   * Wait for running tasks to complete
   */
  async waitForRunningTasks(timeout = 30000) {
    if (this.runningTasks.size === 0) {
      return;
    }

    logger.info({ count: this.runningTasks.size }, 'Waiting for running tasks to complete');

    const startTime = Date.now();
    while (this.runningTasks.size > 0) {
      if (Date.now() - startTime > timeout) {
        logger.warn('Timeout waiting for tasks, forcing shutdown');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Get task queue status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      processing: this.isProcessing,
      runningTasks: this.runningTasks.size,
      maxConcurrent: this.maxConcurrent,
      pollInterval: this.pollInterval
    };
  }

  /**
   * Get task queue metrics
   */
  async getMetrics() {
    const pending = await Task.findByStatus('pending', 1000);
    const running = this.runningTasks.size;

    return {
      pending: pending.length,
      running,
      capacity: this.maxConcurrent,
      utilizationPercent: (running / this.maxConcurrent) * 100
    };
  }
}
```

---

## Component 4: Event Bus

### File: `src/core/eventBus.js`

```javascript
import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

/**
 * Event Bus - Central event handling system
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners
    this.eventCounts = new Map();
    this.initialized = false;
  }

  async initialize() {
    logger.info('Initializing Event Bus...');
    
    // Set up global error handler
    this.on('error', (error) => {
      logger.error({ error }, 'EventBus error');
    });

    this.initialized = true;
  }

  /**
   * Emit event with tracking
   */
  emit(event, data) {
    // Track event counts
    this.eventCounts.set(event, (this.eventCounts.get(event) || 0) + 1);
    
    logger.debug({ event, data }, 'Event emitted');
    
    return super.emit(event, data);
  }

  /**
   * Subscribe to event
   */
  subscribe(event, handler) {
    this.on(event, handler);
    logger.debug({ event }, 'Event handler subscribed');
  }

  /**
   * Unsubscribe from event
   */
  unsubscribe(event, handler) {
    this.off(event, handler);
    logger.debug({ event }, 'Event handler unsubscribed');
  }

  /**
   * Get event bus status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      listenerCount: this.eventNames().length,
      maxListeners: this.getMaxListeners()
    };
  }

  /**
   * Get event metrics
   */
  getMetrics() {
    const metrics = {
      totalEvents: 0,
      eventBreakdown: {}
    };

    this.eventCounts.forEach((count, event) => {
      metrics.totalEvents += count;
      metrics.eventBreakdown[event] = count;
    });

    return metrics;
  }

  /**
   * Clear event counts
   */
  clearMetrics() {
    this.eventCounts.clear();
  }
}
```

[Continues in IMPLEMENTATION-PHASE1-PART2.md...]
