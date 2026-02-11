import { loadAgents } from "../services/agentsService.js";
import { loadKnowledgeIndex } from "../services/knowledgeService.js";
import { models } from "../config/models.js";
import { runGPT } from "../services/gptService.js";
import { AppError } from "../utils/errors.js";
import { extractIntent, intentToAction } from "../utils/intent.js";
import { executeTool } from "../services/executeTool.js";
import { toolRegistry } from "../services/toolRegistry.js";
import logger from "../utils/logger.js";

const extractToolPayload = (text) => {
  if (typeof text !== "string") return null;

  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;

  if (!payload.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(payload);
    if (parsed?.tool && typeof parsed.tool === "string") {
      return {
        tool: parsed.tool,
        args: parsed.args && typeof parsed.args === "object" ? parsed.args : {}
      };
    }
  } catch {
    return null;
  }

  return null;
};

const resolveAllowedTools = (agent) => {
  if (!Array.isArray(agent.tools)) {
    return [];
  }

  const registeredTools = new Set(toolRegistry.list());
  return agent.tools.filter((name) => typeof name === "string" && registeredTools.has(name));
};

export const runAgent = async ({ agentId, input }) => {
  try {
    const agents = await loadAgents();
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) throw new AppError(`Agent not found: ${agentId}`, 404, "AGENT_NOT_FOUND");

    const knowledge = await loadKnowledgeIndex();
    const allowedTools = resolveAllowedTools(agent);

    const provider = agent.modelProvider || "openai";
    const keyName = agent.modelKey || "bsm";
    const apiKey = models[provider]?.[keyName] || models[provider]?.default;
    if (!apiKey) {
      throw new AppError(`Missing API key for provider: ${provider}`, 500, "MISSING_MODEL_API_KEY");
    }

    const toolInstructions = allowedTools.length
      ? `Available tools: ${allowedTools.join(", ")}. If a tool is required, respond ONLY with JSON: {"tool":"name","args":{...}}`
      : "No tools available for this agent.";

    const systemPrompt = `You are ${agent.name}. Role: ${agent.role}. Use the knowledge responsibly. ${toolInstructions}`;
    const userPrompt = `Knowledge:\n${knowledge.join("\n")}\n\nUser Input:\n${input}`;

    const result = await runGPT({
      model: agent.modelName || process.env.OPENAI_MODEL,
      apiKey,
      system: systemPrompt,
      user: userPrompt
    });

    const toolCall = extractToolPayload(result);
    if (toolCall) {
      const toolResult = await executeTool({
        toolName: toolCall.tool,
        args: toolCall.args,
        allowedTools
      });

      return {
        output: `Tool executed: ${toolCall.tool}`,
        tool: { name: toolCall.tool, result: toolResult }
      };
    }

    const intent = extractIntent(result);
    const action = intentToAction(intent);
    if (action) {
      const allowedActions = new Set(agent.actions || []);
      if (!allowedActions.has(action)) {
        throw new AppError(`Action not permitted: ${action}`, 403, "ACTION_NOT_ALLOWED");
      }
    }

    if (intent === "update_file") {
      throw new AppError("Update file intent not implemented", 501, "UPDATE_FILE_NOT_IMPLEMENTED");
    }

    const output = result ? result : "لم يصل رد من الوكيل.";
    return { output };
  } catch (err) {
    logger.error({ err, agentId }, "Agent execution failed");
    throw err;
  }
};
