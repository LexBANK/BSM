import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

class AuditService {
  constructor() {
    this.logDir = path.join(process.cwd(), "logs");
    fs.mkdir(this.logDir, { recursive: true }).catch(() => {});
  }

  async log(action, metadata = {}) {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action,
      metadata
    };

    const file = path.join(this.logDir, `audit-${entry.timestamp.slice(0, 10)}.log`);

    await fs.appendFile(file, `${JSON.stringify(entry)}\n`);
    return entry.id;
  }

  async logAgentActivity(agent, action, details) {
    return this.log("AGENT_ACTIVITY", { agent, action, details });
  }
}

const auditService = new AuditService();

export { AuditService, auditService };
export default auditService;
