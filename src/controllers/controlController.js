import { orchestrator } from "../runners/orchestrator.js";
import logger from "../utils/logger.js";
import { auditLog } from "../utils/auditLogger.js";
import { AppError } from "../utils/errors.js";

/**
 * POST /api/control/run
 * Executes agent pipeline through orchestrator
 * This is the ONLY allowed path for agent execution per governance requirements
 * 
 * Request body:
 * {
 *   event: string,        // Event type for agent selection
 *   payload: object,      // Input data for agents
 *   context?: object      // Optional execution context
 * }
 */
export const runPipeline = async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { event, payload, context = {} } = req.body;

    // Validation
    if (!event || typeof event !== "string") {
      throw new AppError("Event is required and must be a string", 400, "INVALID_EVENT");
    }

    if (!payload || typeof payload !== "object") {
      throw new AppError("Payload is required and must be an object", 400, "INVALID_PAYLOAD");
    }

    // Audit log the execution request
    auditLog({
      eventType: "agent_execution",
      action: "control_run",
      correlationId,
      metadata: {
        event,
        hasContext: !!context,
        timestamp: new Date().toISOString()
      }
    });

    logger.info({
      correlationId,
      event,
      hasContext: !!context
    }, "Starting orchestrated pipeline execution");

    // Execute through orchestrator (the ONLY allowed execution path)
    const result = await orchestrator({
      event,
      payload,
      context: {
        ...context,
        correlationId,
        initiatedBy: "control_api",
        timestamp: new Date().toISOString()
      }
    });

    logger.info({
      correlationId,
      jobId: result.jobId,
      status: result.status
    }, "Pipeline execution completed");

    // Audit log success
    auditLog({
      eventType: "agent_execution",
      action: "control_run_success",
      correlationId,
      metadata: {
        event,
        jobId: result.jobId,
        status: result.status
      }
    });

    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      decision: result.decision,
      results: result.results,
      correlationId
    });

  } catch (err) {
    logger.error({
      correlationId,
      error: err.message,
      stack: err.stack
    }, "Pipeline execution failed");

    // Audit log failure
    auditLog({
      eventType: "agent_execution",
      action: "control_run_failed",
      correlationId,
      metadata: {
        error: err.message,
        code: err.code
      }
    });

    next(err);
  }
};
