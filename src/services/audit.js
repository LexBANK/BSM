import logger from "../utils/logger.js";

/**
 * Audit trail for chat requests.
 * Additive-only service: best-effort logging without affecting runtime flow.
 */
export const logChatAudit = ({ traceId, agent, timestamp = new Date().toISOString() }) => {
  logger.info(
    {
      trace_id: traceId || null,
      agent: agent || "direct",
      timestamp
    },
    "chat.audit"
  );
};

export default {
  logChatAudit
};
