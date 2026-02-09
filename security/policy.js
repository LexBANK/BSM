export function validateAgent(agentSpec) {
  const forbidden = ["write", "delete"];
  const permissions = agentSpec?.permissions || {};

  for (const [perm, level] of Object.entries(permissions)) {
    if (forbidden.includes(level)) {
      throw new Error(`Forbidden permission detected: ${perm}:${level}`);
    }
  }
}
