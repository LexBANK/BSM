import { loadAgents } from "../services/agentsService.js";
import { loadKnowledgeIndex } from "../services/knowledgeService.js";
import { models } from "../config/models.js";
import { runGPT } from "../services/gptService.js";
import { AppError } from "../utils/errors.js";
import { createFile } from "../actions/githubActions.js";
import { extractIntent, intentToAction } from "../utils/intent.js";
import logger from "../utils/logger.js";

const toolExecutors = {
  create_file: async ({ args = {} }) => {
    const targetPath = typeof args.path === "string" && args.path.trim() !== ""
      ? args.path
      : "data/agents/new-agent.yaml";

    const content = typeof args.content === "string" && args.content.trim() !== ""
      ? args.content
      : "id: new-agent\nname: New Agent\nrole: Auto-created\n";

    return createFile(targetPath, content);
  }
};

const normalizeToolName = (tool) => {
  if (!tool) return null;

  if (typeof tool === "string") {
    return tool;
  }

  if (typeof tool === "object") {
    return tool.name || tool.id || null;
  }

  return null;
};

const buildToolSetFromAgent = (agent) => {
  const configuredTools = Array.isArray(agent.tools) ? agent.tools : [];
  const configuredActions = Array.isArray(agent.actions) ? agent.actions : [];

  const names = [
    ...configuredActions,
    ...configuredTools.map((tool) => normalizeToolName(tool)).filter(Boolean)
  ];

  return new Set(names);
};

const parseToolCall = (result) => {
  const match = result.match(/```json\s*([\s\S]*?)\s*```/i);
  const payload = match ? match[1] : result;

  try {
    const parsed = JSON.parse(payload);
    if (parsed?.tool && typeof parsed.tool === "string") {
      return {
        tool: parsed.tool,
        args: parsed.args || {}
      };
    }
  } catch {
    return null;
  }

  return null;
};

async function executeToolCall({ toolCall, allowedTools }) {
  const { tool, args } = toolCall;

  if (!allowedTools.has(tool)) {
    throw new AppError(`Tool not permitted: ${tool}`, 403, "TOOL_NOT_ALLOWED");
  }

  const executor = toolExecutors[tool];
  if (!executor) {
    throw new AppError(`Tool not implemented: ${tool}`, 501, "TOOL_NOT_IMPLEMENTED");
  }

  const data = await executor({ args });
  return { tool, data };
}

export const runAgent = async ({ agentId, input }) => {
  try {
    const agents = await loadAgents();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new AppError(`Agent not found: ${agentId}`, 404, "AGENT_NOT_FOUND");

    const knowledge = await loadKnowledgeIndex();

    const provider = agent.modelProvider || "openai";
    const keyName = agent.modelKey || "bsm";
    const apiKey = models[provider]?.[keyName] || models[provider]?.default;

    const allowedTools = buildToolSetFromAgent(agent);
    const availableTools = Array.from(allowedTools).join(", ") || "none";
    const systemPrompt = `You are ${agent.name}. Role: ${agent.role}. Use the knowledge responsibly. Available tools: ${availableTools}.`;
    const userPrompt = `Knowledge:\n${knowledge.join("\n")}\n\nUser Input:\n${input}\n\nIf a tool is needed, respond ONLY with JSON: {"tool":"tool_name","args":{...}}.`;

    const result = await runGPT({
      model: agent.modelName || process.env.OPENAI_MODEL,
      apiKey,
      system: systemPrompt,
      user: userPrompt
    });

    const toolCall = parseToolCall(result);
    if (toolCall) {
      const execution = await executeToolCall({ toolCall, allowedTools });
      return {
        output: "تم تنفيذ الأداة بنجاح.",
        toolExecution: execution
      };
    }

    const intent = extractIntent(result);
    const action = intentToAction(intent);
    if (action && !allowedTools.has(action)) {
      throw new AppError(`Action not permitted: ${action}`, 403, "ACTION_NOT_ALLOWED");
    }

    if (intent === "create_agent" && allowedTools.has("create_file")) {
      const execution = await executeToolCall({
        toolCall: {
          tool: "create_file",
          args: {
            path: "data/agents/new-agent.yaml",
            content: "id: new-agent\nname: New Agent\nrole: Auto-created\n"
          }
        },
        allowedTools
      });

      return {
        output: result || "تم إنشاء وكيل جديد.",
        toolExecution: execution
      };
    }

    if (intent === "update_file") {
      throw new AppError("Update file intent not implemented", 501, "UPDATE_FILE_NOT_IMPLEMENTED");
    }

    const output =
      (result !== null && result !== undefined && result !== "") ? result : "لم يصل رد من الوكيل.";

    return { output };
  } catch (err) {
    logger.error({ err, agentId }, "Agent execution failed");
    return { output: "حدث خطأ أثناء تشغيل الوكيل." };
  }
};
