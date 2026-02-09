import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";

class AuditService {
  constructor() {
    this.logDir = path.join(process.cwd(), "logs", "audit");
    this.criticalPaths = new Set([
      "data/agents/index.json",
      "data/agents/my-agent.yaml",
      "src/services/audit.js"
    ]);
  }

  async ensureReady() {
    await fsp.mkdir(this.logDir, { recursive: true });
  }

  getSeverity(eventType) {
    const criticalEvents = new Set([
      "CRITICAL_AGENT_DELETION_BLOCKED",
      "AGENTS_LOAD_FAILED",
      "AGENT_DELETED",
      "AGENT_INDEX_UPDATED"
    ]);
    return criticalEvents.has(eventType) ? "CRITICAL" : "INFO";
  }

  async log(eventType, metadata = {}) {
    await this.ensureReady();

    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event: eventType,
      severity: this.getSeverity(eventType),
      ...metadata
    };

    const datePart = new Date().toISOString().split("T")[0];
    const filePath = path.join(this.logDir, `audit-${datePart}.log`);
    await fsp.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");

    return entry;
  }

  async validateAgentDeletion(agentFileName, user = "system") {
    const filePath = path.posix.join("data/agents", agentFileName);

    if (this.criticalPaths.has(filePath)) {
      await this.log("CRITICAL_AGENT_DELETION_BLOCKED", {
        user,
        agentFileName,
        filePath
      });
      throw new Error(`Cannot delete critical agent file: ${agentFileName}`);
    }

    return true;
  }
}

export default new AuditService();
