import { Router } from "express";
import * as orbitController from "../controllers/orbitController.js";

const router = Router();

/**
 * ORBIT Self-Healing Agent Routes
 * 
 * All routes are prefixed with /api/orbit
 */

// Status and monitoring
router.get("/status", orbitController.getStatus);
router.get("/history", orbitController.getHistory);

// Healing actions
router.post("/actions/purge-cache", orbitController.purgeCache);
router.post("/actions/clean-branches", orbitController.cleanBranches);
router.post("/actions/health-check", orbitController.healthCheck);
router.post("/actions/restart-service", orbitController.restartService);
router.post("/actions/healing-cycle", orbitController.runHealingCycle);
router.post("/actions/custom", orbitController.executeCustomAction);

// Telegram notification testing
router.post("/test/notification", orbitController.testNotification);
router.get("/test/connection", orbitController.testConnection);

export default router;
