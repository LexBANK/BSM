import { readFile } from "fs/promises";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { loadJsonFile, fileExists } from "../utils/fileLoader.js";
import cache from "../utils/cache.js";

const CACHE_KEY = "knowledge:all";

export const loadKnowledgeIndex = async () => {
  // Check cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) return cached;

  try {
    const dir = path.join(process.cwd(), "data", "knowledge");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const index = await loadJsonFile(indexPath, "knowledge index");

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    const documents = await Promise.all(
      index.documents.map(async (f) => {
        const p = path.join(dir, f);
        const exists = await fileExists(p);
        return exists ? await readFile(p, "utf8") : "";
      })
    );

    // Cache the result
    cache.set(CACHE_KEY, documents);

    return documents;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to load knowledge: ${err.message}`, 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};

/**
 * Clears the knowledge cache (useful for hot-reload during development)
 */
export const clearKnowledgeCache = () => {
  cache.clear(CACHE_KEY);
};
