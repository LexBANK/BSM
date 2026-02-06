import { agentsCache, knowledgeCache } from "../utils/cache.js";

export const getHealth = (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), correlationId: req.correlationId });
};

export const getMetrics = (req, res) => {
  const usage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    status: "ok",
    uptime: `${Math.floor(uptime)}s`,
    memory: {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    },
    cache: {
      agents: {
        size: agentsCache.size(),
        ttl: "60s"
      },
      knowledge: {
        size: knowledgeCache.size(),
        ttl: "300s"
      }
    },
    timestamp: Date.now(),
    correlationId: req.correlationId
  });
};
