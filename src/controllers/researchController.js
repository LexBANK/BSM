import { orchestrator } from "../runners/orchestrator.js";
import logger from "../utils/logger.js";
import { auditLog } from "../utils/auditLogger.js";
import { AppError } from "../utils/errors.js";

/**
 * POST /api/research
 * Research endpoint that executes queries through orchestrator
 * Uses research agents to gather and analyze information
 * 
 * Request body:
 * {
 *   query: string,           // Research query
 *   context?: object,        // Optional context
 *   sources?: string[]       // Optional source preferences
 * }
 */
export const handleResearch = async (req, res, next) => {
  const correlationId = req.correlationId;

  try {
    const { query, context = {}, sources = [] } = req.body;

    // Validation
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new AppError("Query is required and must be a non-empty string", 400, "INVALID_QUERY");
    }

    if (query.length > 2000) {
      throw new AppError("Query exceeds maximum length of 2000 characters", 400, "QUERY_TOO_LONG");
    }

    logger.info({
      correlationId,
      queryLength: query.length,
      hasSources: sources.length > 0
    }, "Research request received");

    // Audit log
    auditLog({
      eventType: "research",
      action: "research_request",
      correlationId,
      metadata: {
        queryLength: query.length,
        sourcesCount: sources.length,
        timestamp: new Date().toISOString()
      }
    });

    // Execute research through orchestrator
    const result = await orchestrator({
      event: "research.query",
      payload: {
        query,
        sources,
        requestedAt: new Date().toISOString()
      },
      context: {
        ...context,
        correlationId,
        initiatedBy: "research_api",
        timestamp: new Date().toISOString()
      }
    });

    logger.info({
      correlationId,
      jobId: result.jobId,
      status: result.status
    }, "Research request completed");

    // Audit log success
    auditLog({
      eventType: "research",
      action: "research_success",
      correlationId,
      metadata: {
        jobId: result.jobId,
        status: result.status
      }
    });

    res.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      results: result.results,
      decision: result.decision,
      correlationId
    });

  } catch (err) {
    logger.error({
      correlationId,
      error: err.message,
      stack: err.stack
    }, "Research request failed");

    // Audit log failure
    auditLog({
      eventType: "research",
      action: "research_failed",
      correlationId,
      metadata: {
        error: err.message,
        code: err.code
      }
    });

    next(err);
  }
};
