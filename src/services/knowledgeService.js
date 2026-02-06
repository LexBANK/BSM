import fs from "fs";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";

const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

function readIndex() {
  const indexPath = path.join(KNOWLEDGE_DIR, "index.json");

  if (!fs.existsSync(indexPath)) {
    throw new AppError(
      "Missing knowledge index.json. Run: npm run knowledge:index",
      500,
      "KNOWLEDGE_INDEX_MISSING"
    );
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  if (!index || !Array.isArray(index.documents)) {
    throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
  }

  return index;
}

function stripMarkdown(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text, maxLen = 280) {
  const clean = stripMarkdown(text);
  return clean.length <= maxLen ? clean : `${clean.slice(0, maxLen).trim()}…`;
}

export const listKnowledgeDocs = async () => {
  try {
    mustExistDir(KNOWLEDGE_DIR);

    const index = readIndex();
    return index.documents.map((doc) => {
      const docPath = path.join(KNOWLEDGE_DIR, doc.file);
      const content = fs.existsSync(docPath) ? fs.readFileSync(docPath, "utf8") : "";

      return {
        slug: doc.slug,
        title: doc.title,
        file: doc.file,
        path: `data/knowledge/${doc.file}`,
        excerpt: excerpt(content)
      };
    });
  } catch (err) {
    throw new AppError(
      `Failed to list knowledge: ${err.message}`,
      500,
      err.code || "KNOWLEDGE_LIST_FAILED"
    );
  }
};

export const loadKnowledgeIndex = async () => {
  try {
    mustExistDir(KNOWLEDGE_DIR);

    const index = readIndex();
    return index.documents.map((doc) => {
      const docPath = path.join(KNOWLEDGE_DIR, doc.file);
      return fs.existsSync(docPath) ? fs.readFileSync(docPath, "utf8") : "";
    });
  } catch (err) {
    throw new AppError(
      `Failed to load knowledge: ${err.message}`,
      500,
      err.code || "KNOWLEDGE_LOAD_FAILED"
    );
  }
};

export const getKnowledgeDocBySlug = async (slug) => {
  try {
    mustExistDir(KNOWLEDGE_DIR);

    const index = readIndex();
    const doc = index.documents.find((item) => item.slug === slug);
    if (!doc) throw new AppError("Knowledge document not found", 404, "KNOWLEDGE_NOT_FOUND");

    const docPath = path.join(KNOWLEDGE_DIR, doc.file);
    if (!fs.existsSync(docPath)) {
      throw new AppError("Knowledge file missing on disk", 500, "KNOWLEDGE_FILE_MISSING");
    }

    const content = fs.readFileSync(docPath, "utf8");
    return {
      slug: doc.slug,
      title: doc.title,
      file: doc.file,
      path: `data/knowledge/${doc.file}`,
      content
    };
  } catch (err) {
    throw new AppError(
      `Failed to get knowledge: ${err.message}`,
      err.status || 500,
      err.code || "KNOWLEDGE_GET_FAILED"
    );
  }
};
