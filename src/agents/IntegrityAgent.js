import logger from "../utils/logger.js";

export class IntegrityAgent {
  constructor() {
    this.id = "integrity-agent";
    this.name = "Repository Integrity Guardian";
    this.role = "Health Monitor & Cleaner";
  }

  async check(payload = {}) {
    const { repoData = {}, prs = [], issues = [], files = [], onUpdate } = payload;

    logger.info("Running integrity check");

    const checks = {
      stalePRs: this.findStalePRs(prs),
      oldIssues: this.findOldIssues(issues),
      missingDocs: this.checkDocumentation(repoData),
      largeFiles: this.checkLargeFiles(files)
    };

    const healthScore = this.calculateHealthScore(checks);

    if (typeof onUpdate === "function") {
      onUpdate("integrity_check", {
        healthScore,
        issuesFound: Object.values(checks).flat().length
      });
    }

    return {
      agentId: this.id,
      healthScore,
      checks,
      recommendations: this.generateRecommendations(checks),
      timestamp: new Date().toISOString()
    };
  }

  findStalePRs(prs) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return prs.filter((pr) => Number(new Date(pr.updatedAt || 0)) < thirtyDaysAgo && pr.state === "open");
  }

  findOldIssues(issues) {
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    return issues.filter((issue) => Number(new Date(issue.createdAt || 0)) < ninetyDaysAgo && issue.state === "open");
  }

  checkDocumentation(repoData) {
    const required = ["README.md", "LICENSE", "CONTRIBUTING.md"];
    return required.filter((file) => !repoData.files?.includes(file));
  }

  checkLargeFiles(files) {
    return files.filter((file) => Number(file.size || 0) > (10 * 1024 * 1024));
  }

  calculateHealthScore(checks) {
    let score = 100;
    score -= checks.stalePRs.length * 5;
    score -= checks.oldIssues.length * 2;
    score -= checks.missingDocs.length * 10;
    score -= checks.largeFiles.length * 3;
    return Math.max(0, score);
  }

  generateRecommendations(checks) {
    const recommendations = [];

    if (checks.stalePRs.length > 0) recommendations.push(`Close ${checks.stalePRs.length} stale PRs`);
    if (checks.oldIssues.length > 0) recommendations.push(`Archive ${checks.oldIssues.length} old issues`);
    if (checks.missingDocs.length > 0) recommendations.push(`Add missing docs: ${checks.missingDocs.join(", ")}`);
    if (checks.largeFiles.length > 0) recommendations.push("Move large binaries to release assets or object storage");

    return recommendations;
  }
}

export const integrityAgent = new IntegrityAgent();
