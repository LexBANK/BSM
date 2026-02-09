import { Router } from "express";
import { AgentEngine } from "../../core/engine.js";

const router = Router();

router.get("/list", (req, res, next) => {
  try {
    const engine = new AgentEngine();
    engine.loadAgents();
    res.json({ agents: Object.keys(engine.agents) });
  } catch (err) {
    next(err);
  }
});

router.post("/run", (req, res, next) => {
  try {
    const { name } = req.body;
    const engine = new AgentEngine();
    engine.loadAgents();
    const result = engine.runAgent(name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
