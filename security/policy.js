const BLOCKED_PATTERNS = [
  /(rm\s+-rf\s+\/)/i,
  /(chmod\s+777)/i,
  /(curl\s+.*\|\s*(sh|bash))/i,
  /(sudo\b)/i,
  /(\bdd\b\s+if=)/i,
  /(mkfs\.)/i
];

export const evaluatePolicy = ({ action = "", payload = "" } = {}) => {
  const text = `${action} ${payload}`.trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        reason: `Blocked by security policy pattern: ${pattern}`
      };
    }
  }

  return { allowed: true };
};

export const assertPolicy = (input) => {
  const result = evaluatePolicy(input);
  if (!result.allowed) {
    const error = new Error(result.reason);
    error.code = "SECURITY_POLICY_BLOCKED";
    throw error;
  }
  return true;
};
