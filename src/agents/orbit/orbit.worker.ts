import { OrbitAction, OrbitEngine, type Telemetry } from './orbit.engine';

type Env = {
  ORBIT_GITHUB_TOKEN: string;
  ORBIT_GITHUB_REPO?: string;
};

const DEFAULT_REPO = 'OWNER/REPO';

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<Response> {
    const telemetry = await collectTelemetry();
    const engine = new OrbitEngine(telemetry);
    const actions = engine.evaluate();

    if (actions.length > 0) {
      await dispatchToGitHub(actions, env);
    }

    return new Response('OK');
  },
};

async function collectTelemetry(): Promise<Telemetry> {
  // TODO: Replace with Cloudflare Analytics + GitHub API integrations.
  return {
    errors: 0,
    cacheHitRate: 0.5,
    branches: 88,
    duplicateFiles: 3,
    duplicateCodeBlocks: 5,
  };
}

async function dispatchToGitHub(actions: OrbitAction[], env: Env): Promise<void> {
  const repo = env.ORBIT_GITHUB_REPO || DEFAULT_REPO;

  await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.ORBIT_GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: 'orbit_actions',
      client_payload: { actions },
    }),
  });
}
