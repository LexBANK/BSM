import { Router } from "express";

const router = Router();

router.get("/summary", (_req, res) => {
  res.json({
    module: "dashboard",
    status: "ok",
    panels: ["engine", "security", "workflows", "api"]
  });
});

export default router;
