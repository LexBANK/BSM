import EventEmitter from "events";
import { loadAgents } from "../services/agentsService.js";
import { loadKnowledgeIndex } from "../services/knowledgeService.js";
import { models } from "../config/models.js";
import { runGPT } from "../services/gptService.js";
import { AppError } from "../utils/errors.js";
import { extractIntent, intentToAction } from "../utils/intent.js";
import logger from "../utils/logger.js";
import { prMergeAgent } from "../agents/PRMergeAgent.js";

export const agentEvents = new EventEmitter();
const agentStates = new Map();

export const orchestrator = async ({ event, payload, context = {} }) => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  logger.info({ jobId, event }, "Orchestrator started workflow");

  try {
    const selectedAgents = await selectAgentsForEvent(event, payload);
    
    // Check if PR merge agent is in the list
    const prMergeAgentIndex = selectedAgents.findIndex(agent => agent.id === "pr-merge-agent");
    const hasPRMergeAgent = prMergeAgentIndex !== -1;
    
    let results;
    let decision;
    
    if (hasPRMergeAgent && selectedAgents.length > 1) {
      // If we have PR merge agent plus other agents, run in two phases:
      // Phase 1: Run all agents except PR merge agent
      const otherAgents = selectedAgents.filter(agent => agent.id !== "pr-merge-agent");
      results = await executeAgentsParallel(otherAgents, payload, context, jobId);
      
      // Phase 2: Use PR merge agent to evaluate the results
      decision = makePRMergeDecision(results, payload);
      
      // Add PR merge agent result to the results array
      results.push({
        agentId: "pr-merge-agent",
        agentName: "Auto-Merge Orchestrator",
        status: "success",
        result: JSON.stringify(decision),
        metadata: { isPRMergeAgent: true },
        executionTime: 0
      });
    } else {
      // Normal execution - run all agents in parallel
      results = await executeAgentsParallel(selectedAgents, payload, context, jobId);
      decision = hasPRMergeAgent 
        ? makePRMergeDecision(results, payload)
        : makeOrchestrationDecision(results);
    }

    notifyWebSocket({ jobId, status: "completed", event, decision, results });

    return { jobId, status: "success", decision, results };
  } catch (error) {
    logger.error({ jobId, error }, "Orchestrator failed");
    notifyWebSocket({ jobId, status: "failed", event, error: error.message });
    throw new AppError(`Orchestration failed: ${error.message}`, 500, "ORCHESTRATION_FAILED");
  }
};

export async function selectAgentsForEvent(event) {
  const allAgents = await loadAgents();
  const byId = new Map(allAgents.map(agent => [agent.id, agent]));

  if (event === "pull_request.opened" || event === "pull_request.synchronize") {
    // Include PR merge agent to evaluate results after code review and security checks
    return ["code-review-agent", "security-agent", "integrity-agent", "pr-merge-agent"]
      .map(id => byId.get(id))
      .filter(Boolean);
  }

  if (event === "pull_request.ready_for_review") {
    return ["code-review-agent", "security-agent", "pr-merge-agent"]
      .map(id => byId.get(id))
      .filter(Boolean);
  }

  if (event === "check_suite.completed") {
    return ["pr-merge-agent"].map(id => byId.get(id)).filter(Boolean);
  }

  if (event === "repository.health_check") {
    return ["integrity-agent"].map(id => byId.get(id)).filter(Boolean);
  }

  return [byId.get("governance-agent")].filter(Boolean);
}

async function executeAgentsParallel(agents, payload, context, jobId) {
  const work = agents.map(async agent => {
    const start = Date.now();

    try {
      updateAgentState(agent.id, jobId, "running");
      const result = await runSingleAgent(agent, payload, context);
      const outputText = typeof result.output === "string" ? result.output : JSON.stringify(result.output);
      updateAgentState(agent.id, jobId, "completed", outputText);

      return {
        agentId: agent.id,
        agentName: agent.name,
        status: "success",
        result: outputText,
        metadata: result.metadata,
        executionTime: Date.now() - start
      };
    } catch (error) {
      updateAgentState(agent.id, jobId, "failed", null, error.message);
      return {
        agentId: agent.id,
        agentName: agent.name,
        status: "failed",
        error: error.message,
        executionTime: Date.now() - start
      };
    }
  });

  return Promise.all(work);
}

async function runSingleAgent(agent, payload, context) {
  const provider = agent.modelProvider || "openai";
  const keyName = agent.modelKey || "bsm";
  const apiKey = models[provider]?.[keyName] || models[provider]?.default;

  const knowledge = await loadKnowledgeIndex();
  const enrichedContext = {
    ...context,
    knowledge,
    primaryLanguage: context.primaryLanguage || "JavaScript",
    framework: context.framework || "Express"
  };

  const result = await runGPT({
    model: agent.modelName || process.env.OPENAI_MODEL,
    apiKey,
    system: buildSystemPrompt(agent, enrichedContext),
    user: buildUserPrompt(payload, enrichedContext)
  });

  const intent = extractIntent(result);
  const action = intentToAction(intent);

  return {
    output: result,
    metadata: {
      intent,
      action,
      allowed: !action || (agent.actions || []).includes(action)
    }
  };
}

function buildSystemPrompt(agent, context) {
  return `You are ${agent.name}.\nRole: ${agent.role}.\nInstructions: ${agent.instructions}\nRepository context: language=${context.primaryLanguage}, framework=${context.framework}.`;
}

function buildUserPrompt(payload, context) {
  return `Analyze this payload and return JSON with keys decision, score, comments.\nPayload:\n${JSON.stringify(payload, null, 2)}\nKnowledge:\n${context.knowledge.join("\n")}`;
}

function makeOrchestrationDecision(results) {
  const securityResult = results.find(result => result.agentId === "security-agent");
  const codeReviewResult = results.find(result => result.agentId === "code-review-agent");

  const securityBlocked =
    securityResult?.status === "failed" ||
    String(securityResult?.result || "").toUpperCase().includes("CRITICAL");

  if (securityBlocked) {
    return { action: "block_pr", reason: "Security vulnerabilities detected" };
  }

  if (String(codeReviewResult?.result || "").includes("REQUEST_CHANGES")) {
    return { action: "request_changes", reason: "Code quality issues found" };
  }

  const allSuccessful = results.length > 0 && results.every(result => result.status === "success");
  if (allSuccessful) {
    return { action: "approve_and_merge", reason: "All quality gates passed", automated: true };
  }

  return { action: "manual_review", reason: "Inconclusive results from agents" };
}

function makePRMergeDecision(results, payload) {
  logger.info("Making PR merge decision using PRMergeAgent");
  
  // Extract agent results for evaluation
  const otherResults = results
    .filter(r => r.agentId !== "pr-merge-agent")
    .map(r => {
      // Try to parse result as JSON if it contains score/summary
      try {
        const parsed = typeof r.result === "string" ? JSON.parse(r.result) : r.result;
        return {
          agentId: r.agentId,
          status: r.status,
          score: parsed.score,
          summary: parsed.summary,
          ...parsed
        };
      } catch {
        // If not parseable, extract score/summary from text
        const scoreMatch = String(r.result || "").match(/score[:\s]+(\d+)/i);
        const criticalMatch = String(r.result || "").match(/critical[:\s]+(\d+)/i);
        
        return {
          agentId: r.agentId,
          status: r.status,
          score: scoreMatch ? Number(scoreMatch[1]) : undefined,
          summary: criticalMatch ? { critical: Number(criticalMatch[1]) } : undefined
        };
      }
    });

  // Call the PRMergeAgent evaluate method
  const evaluation = prMergeAgent.evaluate(payload, otherResults);
  
  logger.info({ evaluation }, "PR merge evaluation completed");

  // Convert PRMergeAgent action to orchestrator decision format
  if (evaluation.action === "approve") {
    return {
      action: "approve_and_merge",
      reason: evaluation.reason,
      automated: true,
      conditions: evaluation.conditions
    };
  } else {
    return {
      action: "request_changes",
      reason: evaluation.reason,
      conditions: evaluation.conditions
    };
  }
}

function updateAgentState(agentId, jobId, status, result = null, error = null) {
  const state = {
    agentId,
    jobId,
    status,
    result,
    error,
    timestamp: new Date().toISOString()
  };
  agentStates.set(`${agentId}_${jobId}`, state);
  agentEvents.emit("stateChange", state);
}

function notifyWebSocket(data) {
  agentEvents.emit("broadcast", data);
}

export function getAgentStates() {
  return Array.from(agentStates.values());
}
