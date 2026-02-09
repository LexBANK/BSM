import fs from "fs";
import path from "path";
import YAML from "yaml";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { audit } from "./audit.js";

const AGENTS_DIR = path.join(process.cwd(), "data", "agents");

export const loadAgents = async () => {
  try {
    mustExistDir(AGENTS_DIR);

    const indexPath = path.join(AGENTS_DIR, "index.json");
    const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));

    if (!Array.isArray(index.agents)) {
      throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
    }

    const agents = index.agents.map((file) => {
      const filePath = path.join(AGENTS_DIR, file);
      const content = fs.readFileSync(filePath, "utf8");
      const parsed = YAML.parse(content);
      if (!parsed?.id) throw new AppError(`Agent file missing id: ${file}`, 500, "AGENT_INVALID");
      return parsed;
    });

    audit.log("AGENTS_LOADED", { count: agents.length, source: "data/agents/index.json" }, audit.SEVERITY.INFO);
    return agents;
  } catch (err) {
    audit.log(
      "AGENTS_LOAD_FAILED",
      { message: err.message, code: err.code || "AGENTS_LOAD_FAILED" },
      audit.SEVERITY.CRITICAL
    );
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

export const deleteAgentFile = async (fileName) => {
  const targetPath = path.join(AGENTS_DIR, fileName);

  try {
    audit.assertNotCriticalFile(targetPath);
    fs.unlinkSync(targetPath);
    audit.log("AGENT_FILE_DELETED", { fileName }, audit.SEVERITY.INFO);
  } catch (err) {
    const severity = err.code === "CRITICAL_FILE_PROTECTED" ? audit.SEVERITY.CRITICAL : audit.SEVERITY.INFO;
    audit.log("AGENT_FILE_DELETE_BLOCKED", { fileName, message: err.message, code: err.code }, severity);
    throw new AppError(`Failed to delete agent file: ${err.message}`, 400, err.code || "AGENT_DELETE_FAILED");
  }
};
