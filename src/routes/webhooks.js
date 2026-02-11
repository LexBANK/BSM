import { Router } from "express";
import { handleGitHubWebhook } from "../controllers/webhookController.js";
import { handleTelegramWebhook } from "../orbit/webhooks/telegram.js";

const router = Router();

router.post("/github", handleGitHubWebhook);
router.post("/telegram", handleTelegramWebhook);

export default router;
