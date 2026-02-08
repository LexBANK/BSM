import logger from "../utils/logger.js";

export class PRMergeAgent {
  constructor() {
    this.id = "pr-merge-agent";
    this.name = "Auto-Merge Orchestrator";
    this.role = "CI/CD Decision Maker";
    this.conditions = {
      minCodeScore: 7,
      maxCriticalVulns: 0,
      requireReviews: 2
    };
  }

  async evaluate(prData = {}, otherAgentsResults = []) {
    const { prNumber, checks = {}, onUpdate } = prData;

    logger.info({ prNumber }, "Evaluating merge decision");

    const codeReview = otherAgentsResults.find((item) => item.agentId === "code-review-agent");
    const security = otherAgentsResults.find((item) => item.agentId === "security-agent");

    const decision = this.makeDecision(codeReview, security, checks);

    if (decision.action === "merge") {
      await this.performMerge(prNumber, decision);
    }

    if (typeof onUpdate === "function") {
      onUpdate("merge_decision", {
        prNumber,
        decision: decision.action,
        reason: decision.reason
      });
    }

    return {
      agentId: this.id,
      prNumber,
      decision: decision.action,
      reason: decision.reason,
      conditions: decision.conditions,
      timestamp: new Date().toISOString()
    };
  }

  makeDecision(codeReview, security, checks) {
    const conditions = {
      codeScore: (codeReview?.score || 0) >= this.conditions.minCodeScore,
      noCriticalVulns: (security?.summary?.critical || 0) <= this.conditions.maxCriticalVulns,
      checksPassing: checks?.status === "completed",
      hasReviews: (checks?.reviews || 0) >= this.conditions.requireReviews
    };

    if (Object.values(conditions).every(Boolean)) {
      return {
        action: "merge",
        reason: "All quality gates passed",
        conditions
      };
    }

    const failedConditions = Object.entries(conditions)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    return {
      action: "request_changes",
      reason: `Failed conditions: ${failedConditions.join(", ")}`,
      conditions
    };
  }

  async performMerge(prNumber) {
    logger.info({ prNumber }, "Auto-merge requested; GitHub merge call is not enabled in this environment");
    return true;
  }
}

export const prMergeAgent = new PRMergeAgent();
