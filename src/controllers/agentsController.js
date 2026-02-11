import { loadAgents } from "../services/agentsService.js";
import { runAgent } from "../runners/agentRunner.js";
import { env } from "../config/env.js";
import { loadRegistry } from "../utils/registryCache.js";
import logger from "../utils/logger.js";

export const listAgents = async (req, res, next) => {
  try {
    const agents = await loadAgents();
    const mode = req.query.mode; // e.g., ?mode=mobile or ?mode=api
    
    // Validate mode parameter if provided
    const validModes = ["chat", "api", "ci", "mobile", "github", "system", "security"];
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({
        error: `Invalid mode parameter. Must be one of: ${validModes.join(", ")}`,
        correlationId: req.correlationId
      });
    }
    
    // If mode filtering requested, load registry and filter
    if (mode) {
      const registry = loadRegistry();
      
      if (!registry || !registry.agents) {
        logger.warn({ mode }, "Registry not available for mode filtering");
        // Fallback to unfiltered list
        return res.json({ 
          agents, 
          mode,
          filtered: false,
          correlationId: req.correlationId 
        });
      }

      // Filter agents by mode and enrich with context/safety info
      const filteredAgents = agents
        .map(agent => {
          // Find corresponding registry entry
          const registryAgent = registry.agents.find(ra => ra.id === agent.id);
          
          if (!registryAgent) {
            return null; // Skip agents not in registry
          }

          const contexts = registryAgent.contexts?.allowed || [];
          const hasMode = contexts.includes(mode);
          
          if (!hasMode) {
            return null; // Skip agents not allowed in this mode
          }

          // Enrich with governance info
          return {
            ...agent,
            contexts: registryAgent.contexts,
            safety: registryAgent.safety,
            risk: registryAgent.risk,
            approval: registryAgent.approval,
            expose: registryAgent.expose
          };
        })
        .filter(Boolean); // Remove nulls

      return res.json({
        count: filteredAgents.length,
        agents: filteredAgents,
        mode,
        filtered: true,
        correlationId: req.correlationId
      });
    }

    // No mode filtering - enrich all agents with registry info if available
    const registry = loadRegistry();
    if (registry && registry.agents) {
      const enrichedAgents = agents.map(agent => {
        const registryAgent = registry.agents.find(ra => ra.id === agent.id);
        if (registryAgent) {
          return {
            ...agent,
            contexts: registryAgent.contexts,
            safety: registryAgent.safety,
            risk: registryAgent.risk,
            approval: registryAgent.approval,
            expose: registryAgent.expose
          };
        }
        return agent;
      });
      
      return res.json({ 
        agents: enrichedAgents, 
        correlationId: req.correlationId 
      });
    }

    // Fallback to basic agent list
    res.json({ agents, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};

export const executeAgent = async (req, res, next) => {
  try {
    const { agentId, input } = req.body;
    
    if (!agentId || typeof agentId !== "string") {
      return res.status(400).json({ 
        error: "Invalid or missing agentId", 
        correlationId: req.correlationId 
      });
    }
    
    if (!input || typeof input !== "string") {
      return res.status(400).json({ 
        error: "Invalid or missing input", 
        correlationId: req.correlationId 
      });
    }

    if (input.length > env.maxAgentInputLength) {
      return res.status(400).json({
        error: `Input exceeds maximum length of ${env.maxAgentInputLength} characters`,
        correlationId: req.correlationId
      });
    }
    
    const result = await runAgent({ agentId, input });
    res.json({ result, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
};
