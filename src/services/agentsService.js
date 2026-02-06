import { promises as fs } from "fs";
import path from "path";
import YAML from "yaml";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { agentsCache } from "../utils/cache.js";

export const loadAgents = async () => {
  try {
    // Check cache first
    const cached = agentsCache.get("agents:all");
    if (cached) {
      return cached;
    }

    const dir = path.join(process.cwd(), "data", "agents");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    // Use async file read
    const indexContent = await fs.readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.agents)) {
      throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
    }

    // Use Promise.all for parallel loading
    const agents = await Promise.all(
      index.agents.map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), "utf8");
        const parsed = YAML.parse(content);
        if (!parsed?.id) throw new AppError(`Agent file missing id: ${file}`, 500, "AGENT_INVALID");
        return parsed;
      })
    );

    // Cache the result
    agentsCache.set("agents:all", agents);
    
    return agents;
  } catch (err) {
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

export const invalidateAgentsCache = () => {
  agentsCache.invalidate("agents:all");
};
