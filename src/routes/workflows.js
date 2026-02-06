import { Router } from "express";
import { requireWorkflowScope } from "../../security/layer.js";
import { describeWorkflow, runWorkflow } from "../controllers/workflowsController.js";

const router = Router();

router.get("/", describeWorkflow);
router.post("/run", requireWorkflowScope, runWorkflow);

export default router;
