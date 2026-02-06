import logger from "../utils/logger.js";

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 */
export const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Track response finish
  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 500ms)
    if (duration > 500) {
      logger.warn({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      }, "Slow request detected");
    }
    
    // Optionally attach metrics
    if (req.correlationId) {
      logger.debug({
        correlationId: req.correlationId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      }, "Request completed");
    }
  });
  
  next();
};

/**
 * Memory usage tracking
 */
export const getMemoryUsage = () => {
  const usage = process.memoryUsage();
  return {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  };
};

/**
 * Cache statistics
 */
export const getCacheStats = () => {
  const { agentsCache, knowledgeCache } = require("../utils/cache.js");
  return {
    agents: {
      size: agentsCache.size(),
      ttl: "60s"
    },
    knowledge: {
      size: knowledgeCache.size(),
      ttl: "300s"
    }
  };
};
