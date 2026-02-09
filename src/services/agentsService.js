import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { loadJsonFile, loadYamlFile } from "../utils/fileLoader.js";
import cache from "../utils/cache.js";

const CACHE_KEY = "agents:all";

export const loadAgents = async () => {
  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  try {
    const dir = path.join(process.cwd(), "data", "agents");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const index = await loadJsonFile(indexPath, "agents index");

    if (!Array.isArray(index.agents)) {
      throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
    }

    const agents = await Promise.all(
      index.agents.map(async (file) => {
        const filePath = path.join(dir, file);
        const parsed = await loadYamlFile(filePath, `agent file: ${file}`);
        if (!parsed?.id) {
          throw new AppError(`Agent file missing id: ${file}`, 500, "AGENT_INVALID");
        }
        return parsed;
      })
    );

    // Cache the result
    cache.set(CACHE_KEY, agents);

    return agents;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

/**
 * Clears the agents cache (useful for hot-reload during development)
 */
export const clearAgentsCache = () => {
  cache.clear(CACHE_KEY);
};
