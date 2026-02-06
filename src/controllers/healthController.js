import { orbitAgent } from "../services/orbitAgent.js";

export const getHealth = (req, res) => {
  try {
    const orbitStatus = orbitAgent.getStatus();
    
    res.json({
      status: "ok",
      timestamp: Date.now(),
      correlationId: req.correlationId,
      orbit: {
        active: orbitStatus.active,
        telegramEnabled: orbitStatus.telegramEnabled,
        lastHealthCheck: orbitStatus.lastHealthCheck,
        actionCount: orbitStatus.actionCount
      }
    });
  } catch (error) {
    // If ORBIT fails, still return healthy status for the API
    res.json({
      status: "ok",
      timestamp: Date.now(),
      correlationId: req.correlationId,
      orbit: { error: "ORBIT status unavailable" }
    });
  }
};
