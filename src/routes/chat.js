import { Router } from "express";
import { randomUUID } from "crypto";
import logger from "../utils/logger.js";
import { codeReviewAgent } from "../agents/CodeReviewAgent.js";
import { prMergeAgent } from "../agents/PRMergeAgent.js";
import { integrityAgent } from "../agents/IntegrityAgent.js";
import { scanForCVEs } from "../agents/securityScanner.js";

const router = Router();

const rateLimits = new Map();
const VALID_AGENTS = new Set([
  "agent:auto",
  "agent:legal",
  "agent:security",
  "agent:code",
  "agent:research",
  "agent:merge",
  "agent:integrity"
]);

const validateChatRequest = (req, res, next) => {
  const { input, target } = req.body || {};

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return res.status(400).json({
      error: "Invalid input",
      message: "Input is required and must be a non-empty string"
    });
  }

  if (input.length > 10000) {
    return res.status(400).json({
      error: "Input too long",
      message: "Maximum input length is 10000 characters"
    });
  }

  if (target && !VALID_AGENTS.has(target)) {
    return res.status(400).json({
      error: "Invalid target",
      message: `Valid targets are: ${Array.from(VALID_AGENTS).join(", ")}`
    });
  }

  return next();
};

const rateLimiter = (req, res, next) => {
  const sessionId = req.headers["x-session-id"] || req.body?.session || "anonymous";
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 30;

  const current = rateLimits.get(sessionId);
  if (!current || now > current.resetTime) {
    rateLimits.set(sessionId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  current.count += 1;
  if (current.count > maxRequests) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests. Please slow down.",
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }

  return next();
};

async function runSecurityScan(input, context) {
  const dependencies = Array.isArray(context.dependencies) ? context.dependencies : [];
  const vulnerabilities = await scanForCVEs(dependencies);

  return {
    agentId: "security-agent",
    summary: {
      critical: vulnerabilities.vulnerabilities.length,
      details: vulnerabilities.vulnerabilities
    },
    comments: vulnerabilities.recommendation || input,
    modelUsed: "model-router",
    sources: vulnerabilities.sources,
    timestamp: new Date().toISOString()
  };
}

async function routeToAgent(target, input, context) {
  const startTime = Date.now();
  let result;

  switch (target) {
    case "agent:code":
      result = await codeReviewAgent.review({
        prNumber: context.prNumber || 1,
        files: context.files || [],
        diff: input,
        author: context.user || "anonymous"
      });
      break;
    case "agent:security":
      result = await runSecurityScan(input, context);
      break;
    case "agent:integrity":
      result = integrityAgent.check({
        repoData: context.repoData || {},
        prs: context.prs || [],
        issues: context.issues || []
      });
      break;
    case "agent:merge":
      result = prMergeAgent.evaluate(
        { prNumber: context.prNumber || 1 },
        context.otherResults || []
      );
      break;
    case "agent:auto":
    default:
      result = await smartRouting(input, context);
      break;
  }

  return {
    ...result,
    latency: Date.now() - startTime
  };
}

async function smartRouting(input, context) {
  const lowerInput = String(input).toLowerCase();

  if (lowerInput.includes("code") || lowerInput.includes("function") || lowerInput.includes("bug")) {
    return codeReviewAgent.review({
      prNumber: 1,
      files: [],
      diff: input,
      author: context.user || "anonymous"
    });
  }

  if (lowerInput.includes("security") || lowerInput.includes("vulnerability") || lowerInput.includes("cve")) {
    return runSecurityScan(input, context);
  }

  if (lowerInput.includes("merge") || lowerInput.includes("pull request")) {
    return prMergeAgent.evaluate({ prNumber: 1 }, []);
  }

  if (lowerInput.includes("health") || lowerInput.includes("repository") || lowerInput.includes("cleanup")) {
    return integrityAgent.check({ repoData: {}, prs: [], issues: [] });
  }

  return codeReviewAgent.review({
    prNumber: 1,
    files: [],
    diff: input,
    author: context.user || "anonymous"
  });
}

function logAudit(req, res, data) {
  logger.info(
    {
      timestamp: new Date().toISOString(),
      traceId: data.trace_id,
      sessionId: req.headers["x-session-id"] || req.body?.session || "anonymous",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      target: req.body?.target,
      inputLength: req.body?.input?.length,
      outputLength: data.output?.length,
      model: data.model,
      agent: data.agent,
      latency: data.meta?.latency_ms,
      statusCode: res.statusCode
    },
    "Chat API audit log"
  );
}

router.post("/chat", rateLimiter, validateChatRequest, async (req, res) => {
  const { input, target = "agent:auto", session, context = {} } = req.body;
  const traceId = randomUUID();
  res.setHeader("X-Trace-ID", traceId);

  try {
    logger.info({ traceId, target, session }, "Chat request received");

    const result = await routeToAgent(target, input, {
      ...context,
      session,
      user: context.user || "anonymous"
    });

    const response = {
      output: result.comments || result.summary || result.reason || JSON.stringify(result),
      agent: result.agentId || target,
      model: result.modelUsed || "unknown",
      trace_id: traceId,
      meta: {
        tokens: result.usage?.total_tokens || 0,
        latency_ms: result.latency || 0,
        timestamp: new Date().toISOString()
      }
    };

    logAudit(req, res, response);
    return res.json(response);
  } catch (error) {
    logger.error({ error, traceId }, "Chat processing failed");
    return res.status(500).json({
      error: "Processing failed",
      message: "An error occurred while processing your request",
      trace_id: traceId
    });
  }
});

router.get("/health", (_req, res) => {
  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    agents: {
      "code-review": !!codeReviewAgent,
      security: true,
      "pr-merge": !!prMergeAgent,
      integrity: !!integrityAgent
    },
    uptime: process.uptime()
  });
});

router.get("/agents", (_req, res) => {
  return res.json({
    agents: [
      { id: "agent:auto", label: "Auto Routing", description: "Automatically selects best agent" },
      { id: "agent:code", label: "Code Review", description: "Reviews code quality and security" },
      { id: "agent:security", label: "Security Scanner", description: "Scans for vulnerabilities" },
      { id: "agent:integrity", label: "Repository Health", description: "Checks repository health" },
      { id: "agent:merge", label: "PR Merge", description: "Evaluates PR merge decisions" }
    ]
  });
});

export default router;
