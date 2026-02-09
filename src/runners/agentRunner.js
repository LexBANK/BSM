import { loadAgents } from "../services/agentsService.js";
import { loadKnowledgeIndex } from "../services/knowledgeService.js";
import { models } from "../config/models.js";
import { runGPT } from "../services/gptService.js";
import { AppError } from "../utils/errors.js";
import { createFile } from "../actions/githubActions.js";
import { extractIntent, intentToAction } from "../utils/intent.js";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

// Basic input sanitization to prevent prompt injection
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  
  // Limit input length from configuration
  const sanitized = input.slice(0, env.maxInputLength);
  
  // Log if input contains suspicious patterns
  const suspiciousPatterns = [
    /ignore\s+(previous|above|all)\s+instructions/i,
    /system\s*:/i,
    /\[INST\]/i,
    /<\|im_start\|>/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(sanitized))) {
    logger.warn({ inputPreview: sanitized.substring(0, 100) }, "Potentially suspicious input detected");
  }
  
  return sanitized;
};

export const runAgent = async ({ agentId, input }) => {
  try {
    const agents = await loadAgents();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new AppError(`Agent not found: ${agentId}`, 404, "AGENT_NOT_FOUND");

    // Validate and sanitize input
    if (!input || typeof input !== 'string') {
      throw new AppError("Invalid input provided", 400, "INVALID_INPUT");
    }
    
    const sanitizedInput = sanitizeInput(input);

    const knowledge = await loadKnowledgeIndex();

    const provider = agent.modelProvider || "openai";
    const keyName = agent.modelKey || "bsm";
    const apiKey = models[provider]?.[keyName] || models[provider]?.default;

    const systemPrompt = `You are ${agent.name}. Role: ${agent.role}. Use the knowledge responsibly.`;
    const userPrompt = `Knowledge:\n${knowledge.join("\n")}\n\nUser Input:\n${sanitizedInput}`;

    const result = await runGPT({
      model: agent.modelName || process.env.OPENAI_MODEL,
      apiKey,
      system: systemPrompt,
      user: userPrompt
    });

    const intent = extractIntent(result);
    const action = intentToAction(intent);
    if (action) {
      const allowedActions = new Set(agent.actions || []);
      if (!allowedActions.has(action)) {
        throw new AppError(`Action not permitted: ${action}`, 403, "ACTION_NOT_ALLOWED");
      }
    }

    if (intent === "create_agent") {
      await createFile(
        "data/agents/new-agent.yaml",
        "id: new-agent\nname: New Agent\nrole: Auto-created\n"
      );
    }

    if (intent === "update_file") {
      throw new AppError("Update file intent not implemented", 501, "UPDATE_FILE_NOT_IMPLEMENTED");
    }

    // Ensure output is always a string
    const output =
      (result !== null && result !== undefined && result !== "") ? result : "لم يصل رد من الوكيل.";

    return { output };
  } catch (err) {
    logger.error({ err, agentId, input: input?.substring(0, 100) }, "Agent execution failed");
    
    // Return more informative error without exposing sensitive details
    const errorMessage = err.code === "AGENT_NOT_FOUND" 
      ? "الوكيل المطلوب غير موجود."
      : err.code === "ACTION_NOT_ALLOWED"
      ? "الإجراء المطلوب غير مصرح به."
      : "حدث خطأ أثناء تشغيل الوكيل.";
    
    return { output: errorMessage, error: true };
  }
};
