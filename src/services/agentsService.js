import fs from "fs";
import path from "path";
import YAML from "yaml";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";

const validateAgentSchema = (agent, file) => {
  const required = ["id", "name", "version", "contexts", "expose"];
  for (const key of required) {
    if (agent[key] === undefined || agent[key] === null) {
      throw new AppError(`Agent file missing ${key}: ${file}`, 500, "AGENT_SCHEMA_INVALID");
    }
  }

  if (typeof agent.contexts !== "object" || Array.isArray(agent.contexts)) {
    throw new AppError(`Agent contexts must be an object: ${file}`, 500, "AGENT_SCHEMA_INVALID");
  }

  if (typeof agent.expose !== "object" || Array.isArray(agent.expose)) {
    throw new AppError(`Agent expose must be an object: ${file}`, 500, "AGENT_SCHEMA_INVALID");
  }

  return agent;
};

const toPublicAgent = (agent) => ({
  id: agent.id,
  name: agent.name,
  description: agent.description || "",
  version: agent.version,
  contexts: agent.contexts,
  expose: agent.expose
});

export const loadAgents = async () => {
  try {
    const dir = path.join(process.cwd(), "data", "agents");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

    if (!Array.isArray(index.agents)) {
      throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
    }

    const agents = index.agents.map((file) => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const parsed = YAML.parse(content);
      return validateAgentSchema(parsed, file);
    });

    return agents;
  } catch (err) {
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

export const filterAgentsByContext = (agents, context) => {
  if (!context) return agents.map(toPublicAgent);

  return agents
    .filter((agent) => {
      if (context === "chat") {
        return agent.contexts?.chat === true && agent.expose?.selectable === true;
      }
      return agent.contexts?.[context] === true;
    })
    .map(toPublicAgent);
};
