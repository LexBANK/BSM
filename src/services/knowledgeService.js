import { readFile, access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";

export const loadKnowledgeIndex = async () => {
  try {
    const dir = path.join(process.cwd(), "data", "knowledge");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const indexContent = await readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    const documents = await Promise.all(
      index.documents.map(async (f) => {
        const p = path.join(dir, f);
        try {
          await access(p, constants.R_OK);
          return await readFile(p, "utf8");
        } catch {
          return "";
        }
      })
    );

    return documents;
  } catch (err) {
    throw new AppError(`Failed to load knowledge: ${err.message}`, 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};
