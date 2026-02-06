import { executeWorkflow, getWorkflowDefinition } from "../services/workflowsService.js";

export function describeWorkflow(_req, res) {
  return res.json({ workflow: getWorkflowDefinition() });
}

export function runWorkflow(req, res) {
  const execution = executeWorkflow(req.body || {});

  return res.status(202).json({
    scope: req.workflowScope,
    execution
  });
}
