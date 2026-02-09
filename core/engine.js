import fs from "fs";
import path from "path";
import crypto from "crypto";
import { assertPolicy } from "../security/policy.js";

const AGENTS_DIR = path.join(process.cwd(), ".github", "agents");
const RUN_LOG_PATH = path.join(process.cwd(), "logs", "agent_runs.json");

const ensureRunLogFile = () => {
  if (!fs.existsSync(path.dirname(RUN_LOG_PATH))) {
    fs.mkdirSync(path.dirname(RUN_LOG_PATH), { recursive: true });
  }

  if (!fs.existsSync(RUN_LOG_PATH)) {
    fs.writeFileSync(RUN_LOG_PATH, JSON.stringify({ runs: [] }, null, 2));
  }
};

const readRunLog = () => {
  ensureRunLogFile();
  return JSON.parse(fs.readFileSync(RUN_LOG_PATH, "utf8"));
};

const writeRunLog = (nextLog) => {
  const currentRaw = fs.existsSync(RUN_LOG_PATH)
    ? fs.readFileSync(RUN_LOG_PATH, "utf8")
    : "";
  const nextRaw = `${JSON.stringify(nextLog, null, 2)}\n`;

  if (currentRaw !== nextRaw) {
    fs.writeFileSync(RUN_LOG_PATH, nextRaw);
  }
};

const hashContent = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const listAgents = () => {
  if (!fs.existsSync(AGENTS_DIR)) {
    return [];
  }

  const files = fs
    .readdirSync(AGENTS_DIR)
    .filter((file) => file.endsWith(".agent.md"));

  return files.map((file) => {
    const filePath = path.join(AGENTS_DIR, file);
    const content = fs.readFileSync(filePath, "utf8");

    return {
      id: file.replace(/\.agent\.md$/, ""),
      file,
      hash: hashContent(content)
    };
  });
};

export const runAgent = ({ agentId, input }) => {
  const safeInput = String(input || "");
  assertPolicy({ action: "run-agent", payload: safeInput });

  const availableAgents = listAgents();
  const agent = availableAgents.find((entry) => entry.id === agentId);

  if (!agent) {
    const error = new Error(`Agent not found: ${agentId}`);
    error.code = "AGENT_NOT_FOUND";
    throw error;
  }

  const runRecord = {
    id: crypto.randomUUID(),
    agentId,
    agentHash: agent.hash,
    input,
    status: "completed",
    createdAt: new Date().toISOString()
  };

  const currentLog = readRunLog();
  const nextLog = {
    runs: Array.isArray(currentLog.runs) ? [...currentLog.runs, runRecord] : [runRecord]
  };

  writeRunLog(nextLog);

  return {
    message: `Agent ${agentId} executed successfully`,
    runId: runRecord.id
  };
};
