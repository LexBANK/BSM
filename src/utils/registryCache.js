/**
 * Registry Cache Utility
 * Shared caching logic for agents/registry.yaml
 */

import fs from "fs";
import path from "path";
import YAML from "yaml";
import logger from "../utils/logger.js";

// Registry cache
let registryCache = null;
let registryLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load and cache agents registry
 * 
 * @returns {object|null} Parsed registry or null if not found
 */
export function loadRegistry() {
  const now = Date.now();
  
  // Return cached if still valid
  if (registryCache && (now - registryLoadTime) < CACHE_TTL) {
    return registryCache;
  }

  const registryPath = path.join(process.cwd(), "agents", "registry.yaml");
  
  // Check if registry exists
  if (!fs.existsSync(registryPath)) {
    logger.warn("agents/registry.yaml not found, using permissive mode");
    return null;
  }

  try {
    // Load and parse registry
    const content = fs.readFileSync(registryPath, "utf8");
    registryCache = YAML.parse(content);
    registryLoadTime = now;
    
    logger.debug({ 
      agentCount: registryCache?.agents?.length,
      cached: true 
    }, "Registry loaded and cached");
    
    return registryCache;
  } catch (error) {
    logger.error({ error }, "Failed to load registry");
    return null;
  }
}

/**
 * Clear registry cache (useful for testing)
 */
export function clearRegistryCache() {
  registryCache = null;
  registryLoadTime = 0;
  logger.debug("Registry cache cleared");
}

/**
 * Get cache status
 * 
 * @returns {object} Cache status information
 */
export function getRegistryCacheStatus() {
  const now = Date.now();
  const age = registryCache ? now - registryLoadTime : null;
  const isValid = registryCache && age < CACHE_TTL;
  
  return {
    cached: !!registryCache,
    age,
    valid: isValid,
    ttl: CACHE_TTL
  };
}
