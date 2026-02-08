import { codeReviewAgent } from "../agents/CodeReviewAgent.js";
import { securityAgent } from "../agents/SecurityAgent.js";
import { prMergeAgent } from "../agents/PRMergeAgent.js";
import { integrityAgent } from "../agents/IntegrityAgent.js";

export const runAgentOrchestration = async (payload = {}) => {
  const updates = [];
  const onUpdate = (event, data) => {
    updates.push({ event, data, timestamp: new Date().toISOString() });
  };

  const codeReview = await codeReviewAgent.review({ ...(payload.codeReview || {}), onUpdate });
  const security = await securityAgent.scan({ ...(payload.security || {}), onUpdate });
  const merge = await prMergeAgent.evaluate({ ...(payload.merge || {}), onUpdate }, [codeReview, security]);
  const integrity = await integrityAgent.check({ ...(payload.integrity || {}), onUpdate });

  return {
    updates,
    results: {
      codeReview,
      security,
      merge,
      integrity
    }
  };
};
