import { Router } from "express";
import { executeSiri } from "../controllers/siriController.js";

const router = Router();

router.post("/run", executeSiri);

export default router;
