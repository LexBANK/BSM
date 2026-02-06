/**
 * BSM-AgentOS Agent Manager
 * Manages agent lifecycle, registration, and execution
 */

import logger from "../utils/logger.js";
import agentsService from "../services/agentsService.js";
import { runAgent } from "../runners/agentRunner.js";

class AgentManager {
  constructor(engine) {
    this.engine = engine;
    this.agents = new Map(); // agentId -> agent config
    this.activeExecutions = new Map(); // executionId -> execution info
    this.initialized = false;
  }

  /**
   * Initialize the agent manager
   */
  async initialize() {
    if (this.initialized) {
      logger.warn("Agent Manager already initialized");
      return;
    }

    logger.info("Initializing Agent Manager...");

    try {
      // Load all agents from file system
      const agents = await agentsService.getAllAgents();
      
      for (const agent of agents) {
        this.agents.set(agent.id, {
          ...agent,
          status: "active",
          executionCount: 0,
          lastExecuted: null,
        });
      }

      this.initialized = true;
      logger.info({ count: this.agents.size }, "Agent Manager initialized");
    } catch (err) {
      logger.error({ err }, "Failed to initialize Agent Manager");
      throw err;
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId) {
    if (!this.agents.has(agentId)) {
      // Try to load from service
      try {
        const agent = await agentsService.getAgent(agentId);
        if (agent) {
          this.agents.set(agentId, {
            ...agent,
            status: "active",
            executionCount: 0,
            lastExecuted: null,
          });
          return this.agents.get(agentId);
        }
      } catch (err) {
        logger.error({ err, agentId }, "Agent not found");
        throw new Error(`Agent not found: ${agentId}`);
      }
    }
    return this.agents.get(agentId);
  }

  /**
   * List all agents
   */
  async listAgents(filters = {}) {
    let agents = Array.from(this.agents.values());

    // Apply filters
    if (filters.status) {
      agents = agents.filter((a) => a.status === filters.status);
    }
    if (filters.modelProvider) {
      agents = agents.filter((a) => a.modelProvider === filters.modelProvider);
    }

    return agents;
  }

  /**
   * Register a new agent
   */
  async registerAgent(agentConfig) {
    const { id, name, role } = agentConfig;

    if (!id || !name || !role) {
      throw new Error("Agent must have id, name, and role");
    }

    if (this.agents.has(id)) {
      throw new Error(`Agent already registered: ${id}`);
    }

    const agent = {
      ...agentConfig,
      status: "active",
      executionCount: 0,
      lastExecuted: null,
      registeredAt: new Date(),
    };

    this.agents.set(id, agent);
    
    logger.info({ agentId: id, name }, "Agent registered");
    this.engine.eventBus.emit("agent.registered", agent);

    return agent;
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Check for active executions
    const activeCount = Array.from(this.activeExecutions.values())
      .filter((exec) => exec.agentId === agentId).length;

    if (activeCount > 0) {
      throw new Error(`Cannot unregister agent with ${activeCount} active executions`);
    }

    const agent = this.agents.get(agentId);
    this.agents.delete(agentId);

    logger.info({ agentId }, "Agent unregistered");
    this.engine.eventBus.emit("agent.unregistered", agent);

    return agent;
  }

  /**
   * Execute agent with input
   */
  async execute(agentId, input, metadata = {}) {
    const agent = await this.getAgent(agentId);
    
    if (agent.status !== "active") {
      throw new Error(`Agent is not active: ${agentId}`);
    }

    const executionId = `${agentId}-${Date.now()}`;
    const execution = {
      id: executionId,
      agentId,
      startTime: Date.now(),
      status: "running",
    };

    this.activeExecutions.set(executionId, execution);

    try {
      logger.info({ agentId, executionId }, "Executing agent");

      // Execute using the existing runner
      const result = await runAgent(agentId, input, metadata);

      // Update agent stats
      agent.executionCount++;
      agent.lastExecuted = new Date();

      // Update execution
      execution.status = "completed";
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.result = result;

      this.activeExecutions.delete(executionId);

      logger.info({ agentId, executionId, duration: execution.duration }, "Agent execution completed");
      this.engine.eventBus.emit("agent.executed", { agent, execution });

      return result;
    } catch (err) {
      execution.status = "failed";
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = err.message;

      this.activeExecutions.delete(executionId);

      logger.error({ err, agentId, executionId }, "Agent execution failed");
      this.engine.eventBus.emit("agent.executionFailed", { agent, execution, error: err });

      throw err;
    }
  }

  /**
   * Get manager status
   */
  getStatus() {
    return {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter((a) => a.status === "active").length,
      activeExecutions: this.activeExecutions.size,
      initialized: this.initialized,
    };
  }

  /**
   * Shutdown the agent manager
   */
  async shutdown() {
    logger.info("Shutting down Agent Manager...");

    // Wait for active executions to complete
    if (this.activeExecutions.size > 0) {
      logger.warn({ count: this.activeExecutions.size }, "Waiting for active executions to complete");
      
      // Wait up to 30 seconds
      const timeout = 30000;
      const start = Date.now();
      
      while (this.activeExecutions.size > 0 && Date.now() - start < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (this.activeExecutions.size > 0) {
        logger.warn({ count: this.activeExecutions.size }, "Force stopping active executions");
      }
    }

    this.agents.clear();
    this.activeExecutions.clear();
    this.initialized = false;

    logger.info("Agent Manager shut down");
  }
}

export default AgentManager;
