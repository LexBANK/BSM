import { Router } from "express";
import * as scheduleController from "../controllers/scheduleController.js";

const router = Router();

// Team Members
router.get("/team", scheduleController.listTeamMembers);
router.post("/team", scheduleController.createTeamMember);
router.put("/team/:id", scheduleController.modifyTeamMember);
router.delete("/team/:id", scheduleController.removeTeamMember);

// PTO
router.get("/pto", scheduleController.listPTORecords);
router.post("/pto", scheduleController.createPTORequest);
router.put("/pto/:id", scheduleController.modifyPTORequest);
router.delete("/pto/:id", scheduleController.removePTORequest);

// On-Call
router.get("/oncall", scheduleController.listOnCallSchedules);
router.post("/oncall", scheduleController.createOnCallSchedule);
router.put("/oncall/:id", scheduleController.modifyOnCallSchedule);
router.delete("/oncall/:id", scheduleController.removeOnCallSchedule);

// Weekly Capacity
router.get("/capacity/:week", scheduleController.getWeeklyCapacity);

export default router;
