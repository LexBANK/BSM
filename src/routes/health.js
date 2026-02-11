import { Router } from "express";
import { getHealth, getReady } from "../controllers/healthController.js";

const router = Router();
router.get("/", (req, res) => {
  // Route to /health or /ready based on the original path
  if (req.originalUrl.includes("/ready")) {
    return getReady(req, res);
  }
  return getHealth(req, res);
});

export default router;
