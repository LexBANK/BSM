import { Router } from "express";
import { runPipeline } from "../controllers/controlController.js";
import { adminAuth } from "../middleware/auth.js";

const router = Router();

/**
 * POST /api/control/run
 * Executes agent pipeline through orchestrator
 * Requires admin authentication
 * All agent execution must go through this endpoint
 */
router.post("/run", adminAuth, runPipeline);

export default router;
