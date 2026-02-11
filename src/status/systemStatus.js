import fs from "fs";
import path from "path";
import YAML from "yaml";

/**
 * Get real-time system status
 * Read-only function with no side effects
 * 
 * @returns {Object} System status information
 */
export function getSystemStatus() {
  try {
    // Load agent registry to get agent count
    const registryPath = path.join(process.cwd(), "agents", "registry.yaml");
    let agentCount = 0;
    
    if (fs.existsSync(registryPath)) {
      const registryContent = fs.readFileSync(registryPath, "utf8");
      const registry = YAML.parse(registryContent);
      agentCount = registry?.agents?.length || 0;
    }
    
    // Get environment flags
    const safeMode = process.env.SAFE_MODE === "true";
    const mobileMode = process.env.MOBILE_MODE === "true";
    const lanOnly = process.env.LAN_ONLY === "true";
    
    // Get system uptime in seconds
    const uptime = Math.floor(process.uptime());
    
    return {
      ok: true,
      agents: agentCount,
      safeMode,
      mobileMode,
      lanOnly,
      uptime,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    };
  } catch (error) {
    // Return degraded status on error
    return {
      ok: false,
      error: error.message,
      agents: 0,
      safeMode: process.env.SAFE_MODE === "true",
      mobileMode: process.env.MOBILE_MODE === "true",
      lanOnly: process.env.LAN_ONLY === "true",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    };
  }
}
