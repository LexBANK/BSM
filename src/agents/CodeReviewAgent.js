import { modelRouter } from "../config/modelRouter.js";
import logger from "../utils/logger.js";

export class CodeReviewAgent {
  constructor() {
    this.id = "code-review-agent";
    this.name = "Code Review Specialist";
    this.role = "Senior Software Engineer - Code Quality";
    this.version = "2.0";
  }

  async review(payload = {}) {
    const { prNumber, files = [], diff = "", author = "unknown", onUpdate } = payload;
    const complexity = this.analyzeComplexity(files);

    logger.info({ prNumber, files: files.length, complexity }, "Starting code review");

    const result = await modelRouter.execute({
      system: `You are ${this.name}. ${this.role}.
Review code for quality, security, performance and maintainability using SOLID principles.
Be constructive and concise.`,
      user: `Review PR #${prNumber} by ${author}.
Changed files: ${files.length}
Complexity score: ${complexity}
Diff:
${diff.substring(0, 8000)}

Return:
1) Overall score (0-10)
2) Issues with line references
3) Suggestions
4) Final decision: approve or request_changes`
    }, {
      task: "code_review",
      complexity: complexity > 300 ? "critical" : complexity > 100 ? "high" : "medium"
    });

    const parsed = this.parseReview(result.output || "");
    const update = {
      agent: this.id,
      prNumber,
      score: parsed.score,
      status: parsed.score >= 7 ? "approved" : "changes_requested",
      issues: parsed.issues.length
    };

    if (typeof onUpdate === "function") onUpdate("code_review_complete", update);

    return {
      agentId: this.id,
      prNumber,
      score: parsed.score,
      comments: parsed.comments,
      issues: parsed.issues,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString()
    };
  }

  analyzeComplexity(files) {
    return files.reduce((total, file) => total + Number(file?.changes || 0), 0);
  }

  parseReview(text) {
    const scoreMatch = text.match(/(?:overall\s*)?score\s*[:\-]?\s*(\d+(?:\.\d+)?)/i)
      || text.match(/(\d+(?:\.\d+)?)\s*\/\s*10/i);

    const score = scoreMatch ? Number.parseFloat(scoreMatch[1]) : 5;
    const issues = [];

    text.split("\n").forEach((line) => {
      const lineMatch = line.match(/line\s*(\d+)/i);
      if (lineMatch) {
        issues.push({
          line: Number.parseInt(lineMatch[1], 10),
          message: line.trim().slice(0, 220)
        });
      }
    });

    return { score: Number.isFinite(score) ? score : 5, issues, comments: text };
  }
}

export const codeReviewAgent = new CodeReviewAgent();
