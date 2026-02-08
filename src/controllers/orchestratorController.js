import { runOrchestration, generateReport, saveReport } from "../services/orchestratorService.js";
import { runAgentOrchestration } from "../runners/orchestrator.js";
import logger from "../utils/logger.js";

/**
 * Orchestrator Controller
 * Handles HTTP requests for orchestration
 * Coordinates the execution of custom agents via the task tool
 */

export const triggerOrchestration = async (req, res, next) => {
  try {
    // Initialize orchestration structure
    const init = await runOrchestration();
    const results = init.results;

    logger.info("Starting agent orchestration sequence");

    const runAgents = req.body?.runAgents === true;

    if (runAgents) {
      const orchestration = await runAgentOrchestration(req.body?.payload || {});
      results.architect = "Code-review and merge workflow executed.";
      results.runner = JSON.stringify(orchestration.results.merge, null, 2);
      results.security = JSON.stringify(orchestration.results.security.summary, null, 2);

      const report = generateReport(results);
      saveReport(init.reportFile, report);

      return res.json({
        success: true,
        message: "Agent orchestration executed successfully.",
        reportFile: init.reportFile,
        timestamp: init.timestamp,
        orchestration,
        correlationId: req.correlationId
      });
    }

    results.architect = "Orchestrator is ready. Set runAgents=true with payload to execute specialized agents.";
    results.runner = "Awaiting execution request.";
    results.security = "Awaiting execution request.";

    const report = generateReport(results);
    saveReport(init.reportFile, report);

    res.json({
      success: true,
      message: "Orchestration structure created. Set runAgents=true to execute agents.",
      reportFile: init.reportFile,
      timestamp: init.timestamp,
      instructions: {
        step1: "POST /orchestrator/run with { runAgents: true, payload: {...} }",
        step2: "Include codeReview/security/merge/integrity payload sections as needed",
        step3: "Keep all API keys in external key management or environment secrets"
      },
      correlationId: req.correlationId
    });
  } catch (err) {
    next(err);
  }
};
