import { loadAgents } from "../services/agentsService.js";
import { runAgent } from "../runners/agentRunner.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export const listAgents = async (req, res, next) => {
  try {
    const agents = await loadAgents();
    res.json({ agents, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

export const executeAgentInput = async ({ agentId, input }) => {
  if (!agentId || typeof agentId !== "string") {
    throw new AppError("Invalid or missing agentId", 400, "INVALID_AGENT_ID");
  }

  if (!input || typeof input !== "string") {
    throw new AppError("Invalid or missing input", 400, "INVALID_AGENT_INPUT");
  }

  if (input.length > env.maxAgentInputLength) {
    throw new AppError(
      `Input exceeds maximum length of ${env.maxAgentInputLength} characters`,
      400,
      "AGENT_INPUT_TOO_LONG"
    );
  }

  return runAgent({ agentId, input });
};

export const executeAgent = async (req, res, next) => {
  try {
    const { agentId, input } = req.body;
    const result = await executeAgentInput({ agentId, input });
    return res.json({ result, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};
