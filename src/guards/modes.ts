import type { AgentConfig } from './permissions';

type ExecutionContext = {
  mode: 'local' | 'mobile' | 'lan' | 'ci';
};

function isDestructive(agent: AgentConfig): boolean {
  if (agent.safety?.mode) {
    return agent.safety.mode === 'destructive';
  }

  return agent.risk?.level === 'high' || agent.risk?.level === 'critical';
}

export function enforceMode(agent: AgentConfig, context: ExecutionContext) {
  if (context.mode === 'mobile' && isDestructive(agent)) {
    throw new Error(`Agent ${agent.id} blocked in Mobile Mode`);
  }

  if (process.env.SAFE_MODE === 'true' && (agent.network?.outbound?.length ?? 0) > 0) {
    throw new Error(`External calls blocked in SAFE_MODE (${agent.id})`);
  }
}
