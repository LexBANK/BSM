import logger from "../utils/logger.js";

const safeInputMeta = (input) => ({
  length: typeof input === "string" ? input.length : 0,
  hasContent: Boolean(input && String(input).trim())
});

export const logAgentExecution = ({
  event,
  agentId,
  correlationId,
  input,
  status,
  durationMs,
  errorCode,
  errorMessage
}) => {
  logger.info({
    channel: "audit",
    event,
    agentId,
    correlationId,
    input: safeInputMeta(input),
    status,
    durationMs,
    errorCode,
    errorMessage
  }, "Agent audit event");
};
