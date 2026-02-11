import { Router } from "express";
import { handleGitHubWebhook, handleTelegramWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post("/github", handleGitHubWebhook);
router.post("/telegram", handleTelegramWebhook);

export default router;
