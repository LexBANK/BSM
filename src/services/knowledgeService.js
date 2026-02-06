import fs from "fs/promises";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import cache from "../utils/cache.js";

const CACHE_KEY = "knowledge";
const CACHE_TTL_MS = 300000; // 5 minutes (longer TTL as knowledge changes less frequently)

export const loadKnowledgeIndex = async () => {
  try {
    // Check cache first
    const cached = cache.get(CACHE_KEY);
    if (cached) {
      return cached;
    }

    const dir = path.join(process.cwd(), "data", "knowledge");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const indexContent = await fs.readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    // Load all knowledge documents in parallel for better performance
    const documents = await Promise.all(
      index.documents.map(async (f) => {
        const p = path.join(dir, f);
        try {
          return await fs.readFile(p, "utf8");
        } catch (err) {
          // Return empty string if file doesn't exist (matches original behavior)
          return "";
        }
      })
    );

    // Cache the result
    cache.set(CACHE_KEY, documents, CACHE_TTL_MS);

    return documents;
  } catch (err) {
    throw new AppError(`Failed to load knowledge: ${err.message}`, 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};

/**
 * Clear the knowledge cache (useful for invalidation after updates)
 */
export const clearKnowledgeCache = () => {
  cache.clear(CACHE_KEY);
};
