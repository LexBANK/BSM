import { promises as fs } from "fs";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { knowledgeCache } from "../utils/cache.js";

export const loadKnowledgeIndex = async () => {
  try {
    // Check cache first
    const cached = knowledgeCache.get("knowledge:all");
    if (cached) {
      return cached;
    }

    const dir = path.join(process.cwd(), "data", "knowledge");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    // Use async file read
    const indexContent = await fs.readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    // Use Promise.all for parallel loading with error handling
    const documents = await Promise.all(
      index.documents.map(async (f) => {
        const p = path.join(dir, f);
        try {
          // Check if file exists asynchronously
          await fs.access(p);
          return await fs.readFile(p, "utf8");
        } catch {
          return "";
        }
      })
    );

    // Cache the result
    knowledgeCache.set("knowledge:all", documents);
    
    return documents;
  } catch (err) {
    throw new AppError(`Failed to load knowledge: ${err.message}`, 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};

export const invalidateKnowledgeCache = () => {
  knowledgeCache.invalidate("knowledge:all");
};
