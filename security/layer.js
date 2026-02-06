/**
 * Applies a minimal API security policy.
 */
export function applySecurityLayer(req, _res, next) {
  req.security = {
    ip: req.ip,
    userAgent: req.get("user-agent") || "unknown",
    hasAuthHeader: Boolean(req.get("authorization"))
  };

  next();
}

/**
 * Ensures workflow requests are scoped.
 */
export function requireWorkflowScope(req, res, next) {
  const scope = req.get("x-workflow-scope");
  if (!scope) {
    return res.status(403).json({
      error: {
        code: "WORKFLOW_SCOPE_REQUIRED",
        message: "Missing x-workflow-scope header"
      }
    });
  }

  req.workflowScope = scope;
  return next();
}
