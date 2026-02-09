import { Router } from "express";
import { listAgents, runAgent } from "../../core/engine.js";

const router = Router();

router.get("/", (req, res, next) => {
  try {
    const agents = listAgents();
    res.json({ agents, correlationId: req.correlationId });
  } catch (err) {
    next(err);
  }
});

router.post("/run", (req, res, next) => {
  try {
    const { agentId, input } = req.body ?? {};

    if (!agentId || typeof agentId !== "string") {
      return res.status(400).json({
        error: "Invalid or missing agentId",
        correlationId: req.correlationId
      });
    }

    const result = runAgent({ agentId, input });
    return res.json({ result, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

export default router;
