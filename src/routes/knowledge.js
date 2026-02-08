import { Router } from "express";
import { listKnowledge, getKnowledgeBySlug } from "../controllers/knowledgeController.js";

const router = Router();

router.get("/", listKnowledge);
router.get("/:slug", getKnowledgeBySlug);

export default router;
