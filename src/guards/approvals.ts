import type { AgentConfig } from './permissions';

type ExecutionContext = {
  actor: string;
};

export function requireApproval(agent: AgentConfig, _context: ExecutionContext) {
  const approvalRequired =
    agent.safety?.requires_approval === true ||
    agent.approval?.required === true;

  if (approvalRequired && !process.env.ADMIN_TOKEN) {
    throw new Error(`Approval required for ${agent.id}`);
  }
}
