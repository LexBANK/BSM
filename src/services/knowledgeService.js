import { access, readFile } from "fs/promises";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";

const DEFAULT_SNIPPET_LENGTH = 280;
const DEFAULT_MAX_TOTAL_TEXT = 2500;

const normalizeSnippet = (text, maxLength) => {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength)}...`;
};

export const formatKnowledgeForPrompt = (documents, maxTotalText = DEFAULT_MAX_TOTAL_TEXT) => {
  if (!Array.isArray(documents) || maxTotalText <= 0) {
    return "";
  }

  let remaining = maxTotalText;
  const lines = [];

  for (const item of documents) {
    if (!item?.snippet || remaining <= 0) {
      continue;
    }

    const name = item.document || "unknown";
    const candidate = `- ${name}: ${item.snippet}`;
    if (candidate.length <= remaining) {
      lines.push(candidate);
      remaining -= candidate.length;
      continue;
    }

    if (remaining > 20) {
      lines.push(`${candidate.slice(0, remaining - 3)}...`);
      remaining = 0;
    }
  }

  return lines.join("\n");
};

export const loadKnowledgeIndex = async ({
  snippetLength = DEFAULT_SNIPPET_LENGTH,
  maxTotalText = DEFAULT_MAX_TOTAL_TEXT
} = {}) => {
  try {
    const dir = path.join(process.cwd(), "data", "knowledge");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const rawIndex = await readFile(indexPath, "utf8");
    const index = JSON.parse(rawIndex);

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    let remainingChars = Math.max(0, maxTotalText);
    const results = [];

    for (const documentName of index.documents) {
      if (remainingChars <= 0) {
        break;
      }

      const docPath = path.join(dir, documentName);

      try {
        await access(docPath);
      } catch {
        continue;
      }

      const content = await readFile(docPath, "utf8");
      const snippetMax = Math.min(snippetLength, remainingChars);
      const snippet = normalizeSnippet(content, snippetMax);

      if (!snippet) {
        continue;
      }

      results.push({ document: documentName, snippet });
      remainingChars -= snippet.length;
    }

    return results;
  } catch (err) {
    throw new AppError(`Failed to load knowledge: ${err.message}`, 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};
