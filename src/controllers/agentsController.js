import { loadAgents, filterAgentsByContext } from "../services/agentsService.js";
import { runAgent } from "../runners/agentRunner.js";
import { env } from "../config/env.js";
import { logAgentExecution } from "../services/audit.js";

export const listAgents = async (req, res, next) => {
  try {
    const agents = await loadAgents();
    const { context } = req.query;
    const filtered = filterAgentsByContext(agents, context);
    res.json({ agents: filtered, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

export const executeAgent = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { agentId, input } = req.body;

    logAgentExecution({
      event: "agent.execution.started",
      agentId,
      correlationId: req.correlationId,
      input,
      status: "started"
    });
    
    if (!agentId || typeof agentId !== "string") {
      return res.status(400).json({ 
        error: "Invalid or missing agentId", 
        correlationId: req.correlationId 
      });
    }
    
    if (!input || typeof input !== "string") {
      return res.status(400).json({ 
        error: "Invalid or missing input", 
        correlationId: req.correlationId 
      });
    }

    if (input.length > env.maxAgentInputLength) {
      return res.status(400).json({
        error: `Input exceeds maximum length of ${env.maxAgentInputLength} characters`,
        correlationId: req.correlationId
      });
    }
    
    const result = await runAgent({ agentId, input });

    logAgentExecution({
      event: "agent.execution.completed",
      agentId,
      correlationId: req.correlationId,
      input,
      status: "success",
      durationMs: Date.now() - startedAt
    });

    res.json({ result, correlationId: req.correlationId });
  } catch (err) {
    logAgentExecution({
      event: "agent.execution.failed",
      agentId: req.body?.agentId,
      correlationId: req.correlationId,
      input: req.body?.input,
      status: "failed",
      durationMs: Date.now() - startedAt,
      errorCode: err.code,
      errorMessage: err.message
    });
    next(err);
  }
};
