import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { config } from "../config/index.js";

class AuditService {
  constructor() {
    this.logDir = path.join(process.cwd(), "logs", "audit");
    this.criticalFiles = [
      path.resolve(process.cwd(), ".github/agents/my-agent.agent.md"),
      path.resolve(process.cwd(), "src/services/audit.js"),
      path.resolve(process.cwd(), "src/config/index.js"),
      path.resolve(process.cwd(), "data/agents")
    ];
    this.initPromise = this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Audit: Failed to create logs directory", error);
    }
  }

  async log(eventType, metadata = {}) {
    await this.initPromise;

    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event: eventType,
      severity: this.getSeverity(eventType),
      actor: metadata.user || "system",
      ip: metadata.ip || "internal",
      userAgent: metadata.userAgent || "unknown",
      metadata: {
        ...metadata,
        nodeEnv: process.env.NODE_ENV,
        version: process.env.npm_package_version
      }
    };

    await this.writeEntry(entry);

    if (entry.severity === "CRITICAL") {
      await this.alertCritical(entry);
    }

    return entry.id;
  }

  normalizeCandidatePath(filePath) {
    const resolved = path.resolve(process.cwd(), filePath);
    return path.normalize(resolved);
  }

  isCriticalPath(filePath) {
    const candidate = this.normalizeCandidatePath(filePath);

    return this.criticalFiles.some((critical) => {
      const normalizedCritical = path.normalize(critical);
      return candidate === normalizedCritical || candidate.startsWith(`${normalizedCritical}${path.sep}`);
    });
  }

  async validateDeletion(filePath, user) {
    if (this.isCriticalPath(filePath)) {
      await this.log("CRITICAL_FILE_DELETION_ATTEMPT", {
        file: filePath,
        user,
        action: "blocked",
        reason: "Critical file protection"
      });

      throw new Error(`🚫 CRITICAL: Cannot delete ${filePath}. Contact security team.`);
    }

    await this.log("FILE_DELETION_APPROVED", { file: filePath, user });
    return true;
  }

  async logAgentActivity(agentId, action, details) {
    return this.log("AGENT_ACTIVITY", {
      agentId,
      action,
      details,
      category: "agent_execution"
    });
  }

  async logConfigChange(changes, user) {
    return this.log("CONFIG_CHANGE", {
      changes,
      user,
      previousValues: changes.map((c) => ({ key: c.key, old: c.old }))
    });
  }

  getSeverity(eventType) {
    const criticalEvents = new Set([
      "CRITICAL_FILE_DELETION_ATTEMPT",
      "AGENT_DELETION",
      "PERMISSION_ESCALATION",
      "UNAUTHORIZED_ADMIN_ACCESS"
    ]);

    return criticalEvents.has(eventType) ? "CRITICAL" : "INFO";
  }

  async writeEntry(entry) {
    const date = new Date().toISOString().split("T")[0];
    const fileName = `audit-${date}.log`;
    const filePath = path.join(this.logDir, fileName);
    const line = `${JSON.stringify(entry)}\n`;

    await fs.appendFile(filePath, line, "utf8");
  }

  async alertCritical(entry) {
    // eslint-disable-next-line no-console
    console.error("🚨 CRITICAL SECURITY ALERT:", entry);
  }

  async getSuspiciousActivity(hours = 24) {
    await this.initPromise;

    const files = await fs.readdir(this.logDir);
    const suspicious = [];
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);

    for (const file of files) {
      if (!file.endsWith(".log")) continue;

      const content = await fs.readFile(path.join(this.logDir, file), "utf8");
      const lines = content.trim().split("\n").filter(Boolean);

      for (const line of lines) {
        const entry = JSON.parse(line);
        const entryTime = new Date(entry.timestamp).getTime();

        if (entryTime > cutoff && entry.severity === "CRITICAL") {
          suspicious.push(entry);
        }
      }
    }

    return suspicious;
  }
}

const auditService = new AuditService();
export default auditService;
