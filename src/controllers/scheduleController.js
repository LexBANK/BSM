import * as scheduleService from "../services/scheduleService.js";

// Team Members
export const listTeamMembers = async (req, res, next) => {
  try {
    const team = await scheduleService.getTeamMembers();
    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

export const createTeamMember = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Name and email are required" });
    }
    const member = await scheduleService.addTeamMember({ name, email, role });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

export const modifyTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const member = await scheduleService.updateTeamMember(id, req.body);
    res.json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
};

export const removeTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    await scheduleService.deleteTeamMember(id);
    res.json({ success: true, message: "Team member deleted" });
  } catch (error) {
    next(error);
  }
};

// PTO
export const listPTORecords = async (req, res, next) => {
  try {
    const ptos = await scheduleService.getPTORecords();
    res.json({ success: true, data: ptos });
  } catch (error) {
    next(error);
  }
};

export const createPTORequest = async (req, res, next) => {
  try {
    const { memberId, memberName, startDate, endDate, type, notes } = req.body;
    if (!memberId || !memberName || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: "memberId, memberName, startDate, and endDate are required" 
      });
    }
    const pto = await scheduleService.addPTORequest({ 
      memberId, memberName, startDate, endDate, type, notes 
    });
    res.status(201).json({ success: true, data: pto });
  } catch (error) {
    next(error);
  }
};

export const modifyPTORequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pto = await scheduleService.updatePTORequest(id, req.body);
    res.json({ success: true, data: pto });
  } catch (error) {
    next(error);
  }
};

export const removePTORequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    await scheduleService.deletePTORequest(id);
    res.json({ success: true, message: "PTO request deleted" });
  } catch (error) {
    next(error);
  }
};

// On-Call
export const listOnCallSchedules = async (req, res, next) => {
  try {
    const schedules = await scheduleService.getOnCallSchedules();
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};

export const createOnCallSchedule = async (req, res, next) => {
  try {
    const { memberId, memberName, startDate, endDate, type, notes } = req.body;
    if (!memberId || !memberName || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        error: "memberId, memberName, startDate, and endDate are required" 
      });
    }
    const schedule = await scheduleService.addOnCallSchedule({ 
      memberId, memberName, startDate, endDate, type, notes 
    });
    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const modifyOnCallSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await scheduleService.updateOnCallSchedule(id, req.body);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
};

export const removeOnCallSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await scheduleService.deleteOnCallSchedule(id);
    res.json({ success: true, message: "On-call schedule deleted" });
  } catch (error) {
    next(error);
  }
};

// Weekly Capacity
export const getWeeklyCapacity = async (req, res, next) => {
  try {
    const { week } = req.params;
    if (!week) {
      return res.status(400).json({ success: false, error: "Week parameter is required (YYYY-MM-DD)" });
    }
    const capacity = await scheduleService.getWeeklyCapacity(week);
    res.json({ success: true, data: capacity });
  } catch (error) {
    next(error);
  }
};
