import logger from "../utils/logger.js";
import {
  mergePullRequest,
  addComment,
  addLabels
} from "../actions/githubActions.js";

/**
 * ChiefArchitectAgent
 * 
 * Manages Pull Requests automatically by:
 * - Auto-merging PRs that pass all quality gates
 * - Auto-closing stale or non-compliant PRs
 * - Monitoring PR lifecycle and enforcing governance
 */
export class ChiefArchitectAgent {
  constructor(options = {}) {
    this.id = "chief-architect-agent";
    this.name = "Chief Architect Agent";
    this.version = "1.0.0";
    
    // Configuration
    this.config = {
      pollInterval: options.pollInterval || 300000, // 5 minutes default
      stalePRDays: options.stalePRDays || 30,
      autoMergeEnabled: options.autoMergeEnabled !== false, // Default true
      autoCloseEnabled: options.autoCloseEnabled !== false, // Default true
      ...options
    };
    
    this.isRunning = false;
    this.pollTimer = null;
    
    logger.info(
      { 
        id: this.id, 
        pollInterval: this.config.pollInterval,
        autoMergeEnabled: this.config.autoMergeEnabled,
        autoCloseEnabled: this.config.autoCloseEnabled
      },
      `[${this.id}] Initialized`
    );
  }

  /**
   * Start the agent
   * Begins monitoring PRs on a scheduled basis
   */
  start() {
    if (this.isRunning) {
      logger.warn(`[${this.id}] Agent already running`);
      return;
    }

    this.isRunning = true;
    logger.info(`[${this.id}] Starting Chief Architect Agent`);

    // Run initial check
    this.checkPullRequests().catch(error => {
      logger.error({ error: error.message }, `[${this.id}] Initial check failed`);
    });

    // Schedule periodic checks
    if (this.config.pollInterval > 0) {
      this.pollTimer = setInterval(() => {
        this.checkPullRequests().catch(error => {
          logger.error({ error: error.message }, `[${this.id}] Periodic check failed`);
        });
      }, this.config.pollInterval);

      logger.info(
        { pollInterval: this.config.pollInterval },
        `[${this.id}] Scheduled periodic PR checks`
      );
    }
  }

  /**
   * Stop the agent
   * Halts all monitoring activities
   */
  stop() {
    if (!this.isRunning) {
      logger.warn(`[${this.id}] Agent not running`);
      return;
    }

    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    logger.info(`[${this.id}] Chief Architect Agent stopped`);
  }

  /**
   * Check all open PRs and make decisions
   */
  async checkPullRequests() {
    logger.info(`[${this.id}] Checking pull requests...`);

    try {
      // Note: In a real implementation, this would fetch PRs from GitHub API
      // For now, we log that the agent is operational and ready to process PRs
      // when they are provided via webhook or manual trigger
      
      logger.info(
        { 
          autoMergeEnabled: this.config.autoMergeEnabled,
          autoCloseEnabled: this.config.autoCloseEnabled 
        },
        `[${this.id}] PR check cycle completed (webhook-driven mode)`
      );

      return {
        agentId: this.id,
        status: "operational",
        mode: "webhook-driven",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(
        { error: error.message },
        `[${this.id}] Failed to check pull requests`
      );
      throw error;
    }
  }

  /**
   * Evaluate a specific PR for auto-merge
   * 
   * @param {Object} prData - PR information
   * @param {number} prData.prNumber - PR number
   * @param {Object} prData.checks - CI/CD check results
   * @param {Object} prData.reviews - Review status
   * @param {Object} prData.governance - Governance compliance
   * @returns {Object} Decision result
   */
  async evaluateForAutoMerge(prData = {}) {
    const { prNumber, checks = {}, reviews = {}, governance = {} } = prData;

    // Validate required parameters
    if (!prNumber) {
      logger.warn(`[${this.id}] Missing prNumber in evaluateForAutoMerge`);
      return {
        agentId: this.id,
        prNumber: null,
        action: "error",
        reason: "Missing required parameter: prNumber"
      };
    }

    logger.info({ prNumber }, `[${this.id}] Evaluating PR for auto-merge`);

    if (!this.config.autoMergeEnabled) {
      return {
        agentId: this.id,
        prNumber,
        action: "skip",
        reason: "Auto-merge is disabled"
      };
    }

    // Check if all quality gates passed
    const allChecksPassed = checks.conclusion === "success";
    const hasApproval = reviews.approved === true;
    const governanceCompliant = governance.decision === "approve";

    if (allChecksPassed && hasApproval && governanceCompliant) {
      logger.info({ prNumber }, `[${this.id}] All quality gates passed, auto-merging`);

      try {
        const mergeResult = await mergePullRequest(prNumber);
        
        if (mergeResult.merged) {
          await addLabels(prNumber, ["auto-merged", "chief-architect"]);
          
          return {
            agentId: this.id,
            prNumber,
            action: "merged",
            reason: "All quality gates passed",
            timestamp: new Date().toISOString()
          };
        } else {
          return {
            agentId: this.id,
            prNumber,
            action: "merge_failed",
            reason: mergeResult.reason || "Unknown merge failure",
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        logger.error({ prNumber, error: error.message }, `[${this.id}] Merge failed`);
        return {
          agentId: this.id,
          prNumber,
          action: "merge_error",
          reason: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Not ready for merge
    const reasons = [];
    if (!allChecksPassed) reasons.push("CI checks not passing");
    if (!hasApproval) reasons.push("Missing required approval");
    if (!governanceCompliant) reasons.push("Governance compliance issues");

    return {
      agentId: this.id,
      prNumber,
      action: "not_ready",
      reason: reasons.join("; "),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluate a PR for auto-close (stale or non-compliant)
   * 
   * @param {Object} prData - PR information
   * @param {number} prData.prNumber - PR number
   * @param {string} prData.updatedAt - Last update timestamp
   * @param {Object} prData.governance - Governance compliance
   * @returns {Object} Decision result
   */
  async evaluateForAutoClose(prData = {}) {
    const { prNumber, updatedAt, governance = {} } = prData;

    // Validate required parameters
    if (!prNumber) {
      logger.warn(`[${this.id}] Missing prNumber in evaluateForAutoClose`);
      return {
        agentId: this.id,
        prNumber: null,
        action: "error",
        reason: "Missing required parameter: prNumber"
      };
    }

    if (!updatedAt) {
      logger.warn({ prNumber }, `[${this.id}] Missing updatedAt in evaluateForAutoClose`);
      return {
        agentId: this.id,
        prNumber,
        action: "error",
        reason: "Missing required parameter: updatedAt"
      };
    }

    logger.info({ prNumber }, `[${this.id}] Evaluating PR for auto-close`);

    if (!this.config.autoCloseEnabled) {
      return {
        agentId: this.id,
        prNumber,
        action: "skip",
        reason: "Auto-close is disabled"
      };
    }

    // Check if PR is stale
    const lastUpdate = new Date(updatedAt);
    
    // Validate date
    if (isNaN(lastUpdate.getTime())) {
      logger.warn({ prNumber, updatedAt }, `[${this.id}] Invalid date format for updatedAt`);
      return {
        agentId: this.id,
        prNumber,
        action: "error",
        reason: "Invalid date format for updatedAt"
      };
    }

    const now = new Date();
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    const isStale = daysSinceUpdate > this.config.stalePRDays;
    const isBlocked = governance.decision === "block";

    if (isStale || isBlocked) {
      const reason = isStale
        ? `PR is stale (${Math.floor(daysSinceUpdate)} days since last update)`
        : `PR blocked by governance: ${governance.reason}`;

      logger.info({ prNumber, reason }, `[${this.id}] Marking PR for auto-close`);

      try {
        await addComment(
          prNumber,
          `## 🤖 Chief Architect: Auto-Close Recommendation\n\n` +
          `This PR should be closed based on the following:\n\n` +
          `**Reason:** ${reason}\n\n` +
          `The PR has been labeled for review. A maintainer with appropriate permissions should close this PR.\n\n` +
          `If you believe this recommendation is incorrect, please contact the maintainers.`
        );

        await addLabels(prNumber, ["auto-close-recommended", "chief-architect"]);

        // Note: Closing a PR requires PATCH /repos/{owner}/{repo}/pulls/{pull_number}
        // with body: { state: "closed" }
        // This requires additional implementation in githubActions.js
        // For now, we mark the PR and let maintainers close it manually

        return {
          agentId: this.id,
          prNumber,
          action: "marked_for_close",
          reason,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        logger.error({ prNumber, error: error.message }, `[${this.id}] Close failed`);
        return {
          agentId: this.id,
          prNumber,
          action: "close_error",
          reason: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      agentId: this.id,
      prNumber,
      action: "keep_open",
      reason: "PR is active and compliant",
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process a PR through the full decision pipeline
   * 
   * @param {Object} prData - Complete PR information
   * @returns {Object} Final decision
   */
  async processPR(prData = {}) {
    const { prNumber } = prData;

    logger.info({ prNumber }, `[${this.id}] Processing PR`);

    // First check if PR should be closed
    const closeDecision = await this.evaluateForAutoClose(prData);
    if (closeDecision.action === "marked_for_close") {
      return closeDecision;
    }

    // If not closing, check if ready for auto-merge
    const mergeDecision = await this.evaluateForAutoMerge(prData);
    return mergeDecision;
  }

  /**
   * Get agent status
   * 
   * @returns {Object} Agent status information
   */
  getStatus() {
    return {
      agentId: this.id,
      name: this.name,
      version: this.version,
      isRunning: this.isRunning,
      config: {
        pollInterval: this.config.pollInterval,
        stalePRDays: this.config.stalePRDays,
        autoMergeEnabled: this.config.autoMergeEnabled,
        autoCloseEnabled: this.config.autoCloseEnabled
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
export const chiefArchitectAgent = new ChiefArchitectAgent();

// Export both class and instance
export default chiefArchitectAgent;
