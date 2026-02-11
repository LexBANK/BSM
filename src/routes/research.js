import { Router } from "express";
import { handleResearch } from "../controllers/researchController.js";

const router = Router();

/**
 * POST /api/research
 * Research endpoint - executes queries through orchestrator
 * Public endpoint (no auth required for basic research)
 */
router.post("/", handleResearch);

export default router;
