import { runAgent } from "../runners/agentRunner.js";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";

const SIRI_AGENT_ID = "siri-agent";

export const executeSiri = async (req, res, next) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== "string" || !input.trim()) {
      throw new AppError("Invalid or missing input", 400, "INVALID_INPUT");
    }

    if (input.length > env.maxAgentInputLength) {
      throw new AppError(
        `Input exceeds maximum length of ${env.maxAgentInputLength} characters`,
        400,
        "INPUT_TOO_LONG"
      );
    }

    const result = await runAgent({ agentId: SIRI_AGENT_ID, input });

    res.json({ result, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};
