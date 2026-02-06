import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import cache from "../utils/cache.js";

const CACHE_KEY = "agents";
const CACHE_TTL_MS = 60000; // 60 seconds

export const loadAgents = async () => {
  try {
    // Check cache first
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      return cached;
    }

    const dir = path.join(process.cwd(), "data", "agents");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const indexContent = await fs.readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.agents)) {
      throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
    }

    // Load all agent files in parallel for better performance
    const agents = await Promise.all(
      index.agents.map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), "utf8");
        const parsed = YAML.parse(content);
        if (!parsed?.id) throw new AppError(`Agent file missing id: ${file}`, 500, "AGENT_INVALID");
        return parsed;
      })
    );

    // Cache the result
    cache.set(CACHE_KEY, agents, CACHE_TTL_MS);

    return agents;
  } catch (err) {
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

/**
 * Clear the agents cache (useful for invalidation after updates)
 */
export const clearAgentsCache = () => {
  cache.clear(CACHE_KEY);
};
