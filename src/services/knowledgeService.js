import fs from "fs";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";

const BASE_KNOWLEDGE_DIR = path.resolve(process.cwd(), "data", "knowledge");
const MAX_DOCUMENT_CHARS = 4000;
const ALLOWED_TEXT_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".csv"]);

const maskPotentialSecrets = (content) => {
  const patterns = [
    /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/g,
    /\b(?:sk|rk)-[A-Za-z0-9]{20,}\b/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\b(?:api[_-]?key|token|secret|password)\b\s*[:=]\s*["']?[^"'\s\n]+["']?/gi,
  ];

  return patterns.reduce((safeContent, pattern) => safeContent.replace(pattern, "[MASKED_SECRET]"), content);
};

const sanitizeAndTruncateContent = (content) => {
  const safe = maskPotentialSecrets(content);
  return safe.length > MAX_DOCUMENT_CHARS ? `${safe.slice(0, MAX_DOCUMENT_CHARS)}...` : safe;
};

const hasUnsafePathSegments = (userPath) => userPath.split(/[\\/]/).some((segment) => segment === "..");

const resolveKnowledgePath = (userPath) => {
  if (typeof userPath !== "string" || !userPath.trim()) {
    throw new AppError("Invalid knowledge document path", 400, "KNOWLEDGE_DOC_PATH_INVALID");
  }

  if (path.isAbsolute(userPath) || hasUnsafePathSegments(userPath)) {
    throw new AppError("Unsafe knowledge document path", 400, "KNOWLEDGE_DOC_PATH_UNSAFE");
  }

  const ext = path.extname(userPath).toLowerCase();
  if (!ALLOWED_TEXT_EXTENSIONS.has(ext)) {
    throw new AppError(`Unsupported knowledge file extension: ${ext || "(none)"}`, 400, "KNOWLEDGE_DOC_EXT_UNSUPPORTED");
  }

  const resolvedPath = path.resolve(BASE_KNOWLEDGE_DIR, userPath);
  const normalizedBase = `${BASE_KNOWLEDGE_DIR}${path.sep}`;

  if (resolvedPath !== BASE_KNOWLEDGE_DIR && !resolvedPath.startsWith(normalizedBase)) {
    throw new AppError("Knowledge document path escapes base directory", 400, "KNOWLEDGE_DOC_PATH_ESCAPE");
  }

  return resolvedPath;
};

const isTrustedFilePath = (resolvedPath) => {
  if (!fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isFile()) {
    return false;
  }

  const realBase = fs.realpathSync(BASE_KNOWLEDGE_DIR);
  const realFile = fs.realpathSync(resolvedPath);
  const normalizedRealBase = `${realBase}${path.sep}`;

  return realFile === realBase || realFile.startsWith(normalizedRealBase);
};

export const loadKnowledgeIndex = async () => {
  try {
    mustExistDir(BASE_KNOWLEDGE_DIR);

    const indexPath = path.resolve(BASE_KNOWLEDGE_DIR, "index.json");
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    return index.documents.map((userPath) => {
      const resolvedPath = resolveKnowledgePath(userPath);
      if (!isTrustedFilePath(resolvedPath)) {
        return "";
      }

      const rawContent = fs.readFileSync(resolvedPath, "utf8");
      return sanitizeAndTruncateContent(rawContent);
    });
  } catch (err) {
    throw new AppError(`Failed to load knowledge: ${err.message}`, err.status || 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};
