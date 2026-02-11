import { Router } from "express";
import { getHealth, getReady } from "../controllers/healthController.js";

const router = Router();
router.get("/", getHealth);

export default router;
