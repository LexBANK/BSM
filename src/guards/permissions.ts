import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export type AgentConfig = {
  id: string;
  safety?: {
    mode?: string;
    requires_approval?: boolean;
  };
  approval?: {
    required?: boolean;
  };
  risk?: {
    level?: string;
  };
  network?: {
    outbound?: string[];
  };
  execute?: () => Promise<void>;
};

type RegistryShape = {
  agents?: AgentConfig[];
};

let cachedRegistry: RegistryShape | null = null;

function loadRegistry(): RegistryShape {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const registryPath = path.join(process.cwd(), 'agents', 'registry.yaml');
  const source = fs.readFileSync(registryPath, 'utf8');
  cachedRegistry = YAML.parse(source) as RegistryShape;

  return cachedRegistry;
}

export function getAgentConfig(agentId: string): AgentConfig {
  const registry = loadRegistry();
  const agent = registry.agents?.find((a) => a.id === agentId);

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  return agent;
}
