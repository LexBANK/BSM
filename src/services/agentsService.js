import fs from "fs";
import path from "path";
import YAML from "yaml";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import audit from "./audit.js";

const getAgentsDir = () => path.join(process.cwd(), "data", "agents");
const getIndexPath = () => path.join(getAgentsDir(), "index.json");

const readAgentsIndex = (dir) => {
  const indexPath = path.join(dir, "index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

  if (!Array.isArray(index.agents)) {
    throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
  }

  return index;
};

export const loadAgents = async () => {
  try {
    const dir = getAgentsDir();
    mustExistDir(dir);

    const index = readAgentsIndex(dir);

    const agents = index.agents.map((file) => {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const parsed = YAML.parse(content);
      if (!parsed?.id) throw new AppError(`Agent file missing id: ${file}`, 500, "AGENT_INVALID");
      return parsed;
    });

    await audit.log("AGENTS_LOADED", { count: agents.length });
    return agents;
  } catch (err) {
    await audit.log("AGENTS_LOAD_FAILED", { error: err.message, code: err.code || "AGENTS_LOAD_FAILED" });
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

export const deleteAgentFile = async (agentFileName, user = "system") => {
  const dir = getAgentsDir();
  mustExistDir(dir);

  await audit.validateAgentDeletion(agentFileName, user);

  const targetFilePath = path.join(dir, agentFileName);
  if (!fs.existsSync(targetFilePath)) {
    throw new AppError(`Agent file not found: ${agentFileName}`, 404, "AGENT_NOT_FOUND");
  }

  fs.unlinkSync(targetFilePath);

  const indexPath = getIndexPath();
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  index.agents = (index.agents || []).filter((file) => file !== agentFileName);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");

  await audit.log("AGENT_DELETED", { user, agentFileName });
  await audit.log("AGENT_INDEX_UPDATED", { user, removed: agentFileName });

  return { success: true, agentFileName };
};
