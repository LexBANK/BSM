import { env } from "../config/env.js";
import { auditLogger } from "../utils/auditLogger.js";
import { systemStatusService } from "./systemStatus.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";
import YAML from "yaml";
import fs from "fs";
import path from "path";

/**
 * Agent Orchestrator Service
 * Handles agent execution through a controlled pipeline
 * Enforces mode restrictions (mobile, safe, lan)
 */

class AgentOrchestrator {
  constructor() {
    this.registryPath = path.join(process.cwd(), "agents", "registry.yaml");
  }

  /**
   * Load agent registry
   */
  loadRegistry() {
    if (!fs.existsSync(this.registryPath)) {
      throw new AppError("Agent registry not found", 500, "REGISTRY_NOT_FOUND");
    }
    const content = fs.readFileSync(this.registryPath, "utf8");
    return YAML.parse(content);
  }

  /**
   * Validate execution context
   */
  validateContext(context) {
    if (!context.mode) {
      throw new AppError("Execution context must include 'mode'", 400, "INVALID_CONTEXT");
    }
    if (!context.actor) {
      throw new AppError("Execution context must include 'actor'", 400, "INVALID_CONTEXT");
    }
    return true;
  }

  /**
   * Check if agent execution is allowed in current mode
   */
  canExecuteInMode(agentId, agentConfig, context) {
    const restrictions = [];

    // Safe mode blocks all agent execution
    if (env.safeMode) {
      restrictions.push("safe_mode_active");
    }

    // Mobile mode restricts agent execution
    if (env.mobileMode && context.mode === "mobile") {
      restrictions.push("mobile_mode_restricted");
    }

    // Check if agent context is allowed
    const allowedContexts = agentConfig.contexts?.allowed || [];
    if (!allowedContexts.includes("mobile") && context.mode === "mobile") {
      restrictions.push("agent_not_allowed_in_mobile");
    }

    return {
      allowed: restrictions.length === 0,
      restrictions
    };
  }

  /**
   * Check if approval is required and valid
   */
  checkApproval(agentConfig, approvalData = {}) {
    if (!agentConfig.approval || !agentConfig.approval.required) {
      return { required: false, valid: true };
    }

    // In this implementation, approval check is simplified
    // In production, this would validate against an approval system
    const hasApproval = !!approvalData.approvalToken;

    return {
      required: true,
      valid: hasApproval,
      type: agentConfig.approval.type,
      approvers: agentConfig.approval.approvers
    };
  }

  /**
   * Validate agent execution request
   */
  async validateExecution(agentId, context, approvalData = {}) {
    const registry = this.loadRegistry();
    const agentConfig = registry.agents.find(a => a.id === agentId);

    if (!agentConfig) {
      throw new AppError(`Agent '${agentId}' not found in registry`, 404, "AGENT_NOT_FOUND");
    }

    // Validate context
    this.validateContext(context);

    // Check mode restrictions
    const modeCheck = this.canExecuteInMode(agentId, agentConfig, context);
    if (!modeCheck.allowed) {
      throw new AppError(
        `Agent execution blocked: ${modeCheck.restrictions.join(", ")}`,
        403,
        "EXECUTION_BLOCKED",
        { restrictions: modeCheck.restrictions }
      );
    }

    // Check approval requirements
    const approvalCheck = this.checkApproval(agentConfig, approvalData);
    if (approvalCheck.required && !approvalCheck.valid) {
      throw new AppError(
        `Agent '${agentId}' requires approval from: ${approvalCheck.approvers.join(", ")}`,
        403,
        "APPROVAL_REQUIRED",
        { approvers: approvalCheck.approvers, type: approvalCheck.type }
      );
    }

    return {
      agentId,
      agentConfig,
      context,
      validationPassed: true,
      approvalCheck
    };
  }

  /**
   * Run agent pipeline (dry-run mode - validation only)
   */
  async dryRun(agentId, context, approvalData = {}) {
    const startTime = Date.now();

    try {
      // Validate execution
      const validation = await this.validateExecution(agentId, context, approvalData);

      // Audit log
      auditLogger.logAgentOperation({
        action: "dry_run",
        agentId,
        success: true,
        user: context.actor,
        ip: context.ip || "unknown",
        reason: "Dry run validation successful"
      });

      return {
        success: true,
        mode: "dry-run",
        agentId,
        validation,
        message: "Validation passed - agent can be executed",
        duration: Date.now() - startTime
      };
    } catch (error) {
      // Audit log failure
      auditLogger.logAgentOperation({
        action: "dry_run",
        agentId,
        success: false,
        user: context.actor,
        ip: context.ip || "unknown",
        reason: error.message
      });

      throw error;
    }
  }

  /**
   * Run agent pipeline (actual execution)
   * 
   * Note: This is a placeholder for actual agent execution.
   * In the real implementation, this would:
   * 1. Load the agent from data/agents/
   * 2. Execute the agent's actions
   * 3. Return results
   * 
   * For now, it validates and logs the request.
   */
  async runPipeline(agentId, context, approvalData = {}, options = {}) {
    const startTime = Date.now();

    try {
      // Validate execution
      const validation = await this.validateExecution(agentId, context, approvalData);

      logger.info({
        agentId,
        actor: context.actor,
        mode: context.mode
      }, "Agent execution initiated via pipeline");

      // TODO: Actual agent execution would happen here
      // For now, we just validate and log
      const result = {
        success: true,
        mode: "execution",
        agentId,
        message: "Agent execution request received and validated",
        note: "Actual agent execution not yet implemented - this is a placeholder",
        validation,
        duration: Date.now() - startTime
      };

      // Record execution
      systemStatusService.recordExecution(agentId, result, context);

      // Audit log
      auditLogger.logAgentOperation({
        action: "execute",
        agentId,
        success: true,
        user: context.actor,
        ip: context.ip || "unknown",
        reason: "Pipeline execution completed"
      });

      return result;
    } catch (error) {
      // Log error
      systemStatusService.logError(error, { agentId, actor: context.actor });

      // Audit log failure
      auditLogger.logAgentOperation({
        action: "execute",
        agentId,
        success: false,
        user: context.actor,
        ip: context.ip || "unknown",
        reason: error.message
      });

      throw error;
    }
  }

  /**
   * Get agent information
   */
  getAgentInfo(agentId) {
    const registry = this.loadRegistry();
    const agentConfig = registry.agents.find(a => a.id === agentId);

    if (!agentConfig) {
      throw new AppError(`Agent '${agentId}' not found`, 404, "AGENT_NOT_FOUND");
    }

    return agentConfig;
  }

  /**
   * List all agents
   */
  listAgents() {
    const registry = this.loadRegistry();
    return registry.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      category: agent.category,
      risk: agent.risk.level,
      approvalRequired: agent.approval.required,
      contexts: agent.contexts.allowed,
      autoStart: agent.startup.auto_start
    }));
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestrator();
