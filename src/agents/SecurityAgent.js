import { modelRouter } from "../config/modelRouter.js";
import logger from "../utils/logger.js";

export class SecurityAgent {
  constructor() {
    this.id = "security-agent";
    this.name = "Security Vulnerability Scanner";
    this.role = "CVE Hunter & Security Analyst";
    this.version = "2.0";
  }

  async scan(payload = {}) {
    const { prNumber, dependencies = [], code = "", files = [], onUpdate } = payload;
    const scanId = `sec_${Date.now()}`;

    logger.info({ scanId, prNumber }, "Security scan started");

    const results = {
      agentId: this.id,
      scanId,
      prNumber,
      timestamp: new Date().toISOString(),
      cves: [],
      secrets: [],
      codeVulns: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 }
    };

    if (dependencies.length > 0) {
      results.cves = await this.searchCVEs(dependencies);
    }

    if (files.length > 0) {
      results.secrets = this.scanSecrets(files);
    }

    if (code) {
      results.codeVulns = await this.analyzeCode(code);
    }

    results.summary = this.calculateSummary(results);

    if (results.summary.critical > 0 && typeof onUpdate === "function") {
      onUpdate("security_alert", {
        type: "critical_vulnerability",
        prNumber,
        scanId,
        criticalCount: results.summary.critical,
        message: `${results.summary.critical} critical vulnerabilities found`
      });
    }

    return results;
  }

  async searchCVEs(dependencies) {
    const depString = dependencies
      .map((item) => `${item.name || "unknown"}@${item.version || "latest"}`)
      .join(", ");

    const result = await modelRouter.execute({
      system: "You are a security researcher. Find CVEs and vulnerabilities with severity and fixed versions.",
      user: `Find vulnerabilities for: ${depString}`
    }, {
      task: "security_scan",
      complexity: "high",
      requiresSearch: true
    });

    return this.parseCVEs(result.output || "", result.citations || []);
  }

  parseCVEs(text, citations) {
    const cves = [];
    const pattern = /CVE-\d{4}-\d{4,7}/g;

    for (const match of text.matchAll(pattern)) {
      const context = text.slice(Math.max(0, match.index - 100), Math.min(text.length, (match.index || 0) + 200));
      cves.push({
        id: match[0],
        severity: this.extractSeverity(context),
        description: context.slice(0, 180),
        sources: citations
      });
    }

    return cves;
  }

  scanSecrets(files) {
    const patterns = {
      "AWS Key": /AKIA[0-9A-Z]{16}/,
      "Private Key": /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/,
      "Generic API Key": /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_\-]{24,}["']/i,
      "Database URL": /(postgres|mysql|mongodb):\/\/[^\s]+/i
    };

    const findings = [];

    files.forEach((file) => {
      const content = file.content || "";
      Object.entries(patterns).forEach(([type, regex]) => {
        if (regex.test(content)) {
          findings.push({
            type,
            file: file.filename || file.path || "unknown",
            severity: "CRITICAL"
          });
        }
      });
    });

    return findings;
  }

  async analyzeCode(code) {
    const result = await modelRouter.execute({
      system: "Find security vulnerabilities: SQLi, XSS, CSRF, SSRF, path traversal, unsafe deserialization, auth bypass.",
      user: `Analyze code for vulnerabilities and provide severity:\n${code.substring(0, 5000)}`
    }, {
      task: "security_scan",
      complexity: "critical"
    });

    return this.parseVulnerabilities(result.output || "");
  }

  parseVulnerabilities(text) {
    return text
      .split("\n")
      .filter((line) => /critical|high|medium|low|vuln|injection|xss|csrf|rce/i.test(line))
      .slice(0, 20)
      .map((line) => ({
        severity: this.extractSeverity(line),
        description: line.trim().slice(0, 220)
      }));
  }

  extractSeverity(text) {
    const normalized = text.toUpperCase();
    if (normalized.includes("CRITICAL") || /\b9\.|\b10\./.test(normalized)) return "CRITICAL";
    if (normalized.includes("HIGH") || /\b7\.|\b8\./.test(normalized)) return "HIGH";
    if (normalized.includes("MEDIUM") || /\b5\.|\b6\./.test(normalized)) return "MEDIUM";
    return "LOW";
  }

  calculateSummary(results) {
    const summary = { critical: 0, high: 0, medium: 0, low: 0 };
    [...results.cves, ...results.secrets, ...results.codeVulns].forEach((item) => {
      const key = (item.severity || "MEDIUM").toLowerCase();
      summary[key] = (summary[key] || 0) + 1;
    });

    return summary;
  }
}

export const securityAgent = new SecurityAgent();
