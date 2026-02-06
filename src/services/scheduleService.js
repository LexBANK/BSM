import fs from "fs/promises";
import path from "path";

const SCHEDULE_DIR = path.join(process.cwd(), "data", "schedule");
const TEAM_FILE = path.join(SCHEDULE_DIR, "team.json");
const PTO_FILE = path.join(SCHEDULE_DIR, "pto.json");
const ONCALL_FILE = path.join(SCHEDULE_DIR, "oncall.json");

// Ensure schedule directory and files exist
async function ensureScheduleFiles() {
  try {
    await fs.mkdir(SCHEDULE_DIR, { recursive: true });
    
    // Initialize team file if not exists
    try {
      await fs.access(TEAM_FILE);
    } catch {
      await fs.writeFile(TEAM_FILE, JSON.stringify([], null, 2));
    }
    
    // Initialize PTO file if not exists
    try {
      await fs.access(PTO_FILE);
    } catch {
      await fs.writeFile(PTO_FILE, JSON.stringify([], null, 2));
    }
    
    // Initialize oncall file if not exists
    try {
      await fs.access(ONCALL_FILE);
    } catch {
      await fs.writeFile(ONCALL_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error("Error ensuring schedule files:", error);
    throw error;
  }
}

// Team Members
export async function getTeamMembers() {
  await ensureScheduleFiles();
  const data = await fs.readFile(TEAM_FILE, "utf8");
  return JSON.parse(data);
}

export async function addTeamMember(member) {
  await ensureScheduleFiles();
  const team = await getTeamMembers();
  const newMember = {
    id: Date.now().toString(),
    name: member.name,
    email: member.email,
    role: member.role || "Developer",
    active: true,
    createdAt: new Date().toISOString()
  };
  team.push(newMember);
  await fs.writeFile(TEAM_FILE, JSON.stringify(team, null, 2));
  return newMember;
}

export async function updateTeamMember(id, updates) {
  await ensureScheduleFiles();
  const team = await getTeamMembers();
  const index = team.findIndex(m => m.id === id);
  if (index === -1) {
    throw new Error("Team member not found");
  }
  team[index] = { ...team[index], ...updates, updatedAt: new Date().toISOString() };
  await fs.writeFile(TEAM_FILE, JSON.stringify(team, null, 2));
  return team[index];
}

export async function deleteTeamMember(id) {
  await ensureScheduleFiles();
  const team = await getTeamMembers();
  const filtered = team.filter(m => m.id !== id);
  await fs.writeFile(TEAM_FILE, JSON.stringify(filtered, null, 2));
  return { success: true };
}

// PTO (Paid Time Off)
export async function getPTORecords() {
  await ensureScheduleFiles();
  const data = await fs.readFile(PTO_FILE, "utf8");
  return JSON.parse(data);
}

export async function addPTORequest(request) {
  await ensureScheduleFiles();
  const ptos = await getPTORecords();
  const newPTO = {
    id: Date.now().toString(),
    memberId: request.memberId,
    memberName: request.memberName,
    startDate: request.startDate,
    endDate: request.endDate,
    type: request.type || "vacation",
    status: "approved",
    notes: request.notes || "",
    createdAt: new Date().toISOString()
  };
  ptos.push(newPTO);
  await fs.writeFile(PTO_FILE, JSON.stringify(ptos, null, 2));
  return newPTO;
}

export async function updatePTORequest(id, updates) {
  await ensureScheduleFiles();
  const ptos = await getPTORecords();
  const index = ptos.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error("PTO request not found");
  }
  ptos[index] = { ...ptos[index], ...updates, updatedAt: new Date().toISOString() };
  await fs.writeFile(PTO_FILE, JSON.stringify(ptos, null, 2));
  return ptos[index];
}

export async function deletePTORequest(id) {
  await ensureScheduleFiles();
  const ptos = await getPTORecords();
  const filtered = ptos.filter(p => p.id !== id);
  await fs.writeFile(PTO_FILE, JSON.stringify(filtered, null, 2));
  return { success: true };
}

// On-Call Schedules
export async function getOnCallSchedules() {
  await ensureScheduleFiles();
  const data = await fs.readFile(ONCALL_FILE, "utf8");
  return JSON.parse(data);
}

export async function addOnCallSchedule(schedule) {
  await ensureScheduleFiles();
  const schedules = await getOnCallSchedules();
  const newSchedule = {
    id: Date.now().toString(),
    memberId: schedule.memberId,
    memberName: schedule.memberName,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    type: schedule.type || "primary",
    notes: schedule.notes || "",
    createdAt: new Date().toISOString()
  };
  schedules.push(newSchedule);
  await fs.writeFile(ONCALL_FILE, JSON.stringify(schedules, null, 2));
  return newSchedule;
}

export async function updateOnCallSchedule(id, updates) {
  await ensureScheduleFiles();
  const schedules = await getOnCallSchedules();
  const index = schedules.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error("On-call schedule not found");
  }
  schedules[index] = { ...schedules[index], ...updates, updatedAt: new Date().toISOString() };
  await fs.writeFile(ONCALL_FILE, JSON.stringify(schedules, null, 2));
  return schedules[index];
}

export async function deleteOnCallSchedule(id) {
  await ensureScheduleFiles();
  const schedules = await getOnCallSchedules();
  const filtered = schedules.filter(s => s.id !== id);
  await fs.writeFile(ONCALL_FILE, JSON.stringify(filtered, null, 2));
  return { success: true };
}

// Weekly Capacity Calculation
export async function getWeeklyCapacity(weekStart) {
  await ensureScheduleFiles();
  const team = await getTeamMembers();
  const ptos = await getPTORecords();
  const oncalls = await getOnCallSchedules();
  
  // Calculate dates for the week
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  
  const activeTeam = team.filter(m => m.active);
  
  // Calculate PTO days
  const ptoDays = ptos.filter(pto => {
    const ptoStart = new Date(pto.startDate);
    const ptoEnd = new Date(pto.endDate);
    return (ptoStart <= endDate && ptoEnd >= startDate);
  });
  
  // Calculate on-call assignments
  const onCallAssignments = oncalls.filter(schedule => {
    const scheduleStart = new Date(schedule.startDate);
    const scheduleEnd = new Date(schedule.endDate);
    return (scheduleStart <= endDate && scheduleEnd >= startDate);
  });
  
  // Calculate available capacity
  const totalCapacity = activeTeam.length * 5; // 5 working days per week
  const ptoCapacity = ptoDays.reduce((sum, pto) => {
    const ptoStart = new Date(pto.startDate);
    const ptoEnd = new Date(pto.endDate);
    const weekEnd = new Date(endDate);
    const weekStart = new Date(startDate);
    
    const overlapStart = ptoStart > weekStart ? ptoStart : weekStart;
    const overlapEnd = ptoEnd < weekEnd ? ptoEnd : weekEnd;
    
    const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
    return sum + Math.min(days, 5);
  }, 0);
  
  const availableCapacity = totalCapacity - ptoCapacity;
  
  return {
    weekStart: startDate.toISOString().split('T')[0],
    weekEnd: endDate.toISOString().split('T')[0],
    totalTeam: activeTeam.length,
    totalCapacity,
    ptoCapacity,
    availableCapacity,
    utilizationPercent: Math.round((availableCapacity / totalCapacity) * 100),
    onCallCount: onCallAssignments.length,
    teamMembers: activeTeam.map(m => ({
      id: m.id,
      name: m.name,
      role: m.role
    })),
    ptoDays: ptoDays.map(p => ({
      id: p.id,
      memberName: p.memberName,
      startDate: p.startDate,
      endDate: p.endDate,
      type: p.type
    })),
    onCallAssignments: onCallAssignments.map(s => ({
      id: s.id,
      memberName: s.memberName,
      startDate: s.startDate,
      endDate: s.endDate,
      type: s.type
    }))
  };
}
