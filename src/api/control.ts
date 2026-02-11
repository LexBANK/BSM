import express from 'express';
import { runPipeline, type ExecutionContext } from '../orchestrator';

const router = express.Router();

function normalizeMode(mode: unknown): ExecutionContext['mode'] {
  const value = Array.isArray(mode) ? mode[0] : mode;

  if (value === 'mobile' || value === 'lan' || value === 'ci') {
    return value;
  }

  return 'local';
}

router.post('/run', async (req, res) => {
  const { agents } = req.body;

  if (!Array.isArray(agents) || agents.some((agent) => typeof agent !== 'string')) {
    res.status(400).json({ error: 'agents must be a string array' });
    return;
  }

  try {
    const actorHeader = req.headers['x-actor'];
    const actor = Array.isArray(actorHeader) ? actorHeader[0] : actorHeader;

    await runPipeline(agents, {
      mode: normalizeMode(req.headers['x-mode']),
      actor: actor || 'unknown',
      ip: req.ip,
    });

    res.json({ status: 'ok' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    res.status(403).json({ error: message });
  }
});

export default router;
