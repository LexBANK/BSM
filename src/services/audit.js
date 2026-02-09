import fs from "fs";
import path from "path";

const AUDIT_DIR = path.join(process.cwd(), "logs", "audit");
const AUDIT_FILE = path.join(AUDIT_DIR, "events.log");

const SEVERITY = {
  INFO: "INFO",
  CRITICAL: "CRITICAL"
};

const CRITICAL_FILES = new Set([
  path.join(process.cwd(), "data", "agents", "index.json"),
  path.join(process.cwd(), "data", "agents", "my-agent.yaml")
]);

const ensureAuditDir = () => {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
};

const normalizePath = (filePath) => path.resolve(filePath);

const isCriticalFile = (filePath) => CRITICAL_FILES.has(normalizePath(filePath));

const assertNotCriticalFile = (filePath) => {
  if (isCriticalFile(filePath)) {
    const err = new Error(`Blocked operation on critical file: ${filePath}`);
    err.code = "CRITICAL_FILE_PROTECTED";
    throw err;
  }
};

const log = (eventType, metadata = {}, severity = SEVERITY.INFO) => {
  ensureAuditDir();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    metadata
  });
  fs.appendFileSync(AUDIT_FILE, `${line}\n`, "utf8");
};

export const audit = {
  SEVERITY,
  log,
  isCriticalFile,
  assertNotCriticalFile
};
