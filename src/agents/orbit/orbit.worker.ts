import { OrbitEngine } from './orbit.engine'

const GITHUB_REPO = process.env.ORBIT_GITHUB_REPO || 'OWNER/REPO'
const GITHUB_TOKEN = process.env.ORBIT_GITHUB_TOKEN

export default {
  async scheduled() {
    const telemetry = await collectTelemetry()
    const engine = new OrbitEngine(telemetry)
    const actions = engine.evaluate()

    if (actions.length > 0) {
      await dispatchToGitHub(actions)
    }

    return new Response('OK', { status: 200 })
  }
}

async function collectTelemetry() {
  // TODO: connect Cloudflare Analytics + GitHub API
  return {
    errors: Math.floor(Math.random() * 5),
    cacheHitRate: 0.75,
    branches: 12,
    duplicateFiles: 0,
    duplicateCodeBlocks: 0
  }
}

async function dispatchToGitHub(actions: string[]) {
  await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    },
    body: JSON.stringify({
      event_type: 'orbit_actions',
      client_payload: { actions }
    })
  })
}
