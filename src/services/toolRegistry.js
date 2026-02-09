import path from "path";
import { createFile } from "../actions/githubActions.js";
import { AppError } from "../utils/errors.js";

const registry = new Map();

const ensureSafePath = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    throw new AppError("Tool argument 'path' is required", 400, "TOOL_INVALID_PATH");
  }

  const normalized = path.posix.normalize(filePath.replaceAll("\\", "/")).trim();

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new AppError("Unsafe file path", 400, "TOOL_UNSAFE_PATH");
  }

  return normalized;
};

registry.set("create_file", async ({ path: filePath, content = "" }) => {
  const safePath = ensureSafePath(filePath);
  await createFile(safePath, content);
  return { ok: true, path: safePath };
});

export const toolRegistry = {
  has: (name) => registry.has(name),
  list: () => [...registry.keys()],
  get: (name) => registry.get(name)
};
