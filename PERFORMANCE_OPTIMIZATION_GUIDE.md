# BSM Performance Optimization Quick Reference Guide

## Table of Contents
1. [Caching Implementation](#caching-implementation)
2. [Async File I/O Migration](#async-file-io-migration)
3. [Knowledge Optimization](#knowledge-optimization)
4. [Connection Pooling](#connection-pooling)
5. [Monitoring Setup](#monitoring-setup)

---

## 1. Caching Implementation

### Simple In-Memory Cache

```javascript
// src/utils/cache.js (NEW FILE)
class SimpleCache {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const agentsCache = new SimpleCache(60000); // 1 minute TTL
export const knowledgeCache = new SimpleCache(300000); // 5 minutes TTL
```

### Apply to agentsService.js

```javascript
// src/services/agentsService.js
import { promises as fs } from "fs";
import path from "path";
import YAML from "yaml";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { agentsCache } from "../utils/cache.js";

export const loadAgents = async () => {
  try {
    // Check cache first
    const cached = agentsCache.get('agents:all');
    if (cached) {
      return cached;
    }

    const dir = path.join(process.cwd(), "data", "agents");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    
    // ASYNC file read
    const indexContent = await fs.readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.agents)) {
      throw new AppError("Invalid agents index.json", 500, "AGENTS_INDEX_INVALID");
    }

    // PARALLEL file reads
    const agents = await Promise.all(
      index.agents.map(async (file) => {
        const content = await fs.readFile(path.join(dir, file), "utf8");
        const parsed = YAML.parse(content);
        if (!parsed?.id) throw new AppError(`Agent file missing id: ${file}`, 500, "AGENT_INVALID");
        return parsed;
      })
    );

    // Cache the result
    agentsCache.set('agents:all', agents);
    
    return agents;
  } catch (err) {
    throw new AppError(`Failed to load agents: ${err.message}`, 500, err.code || "AGENTS_LOAD_FAILED");
  }
};

// Add cache invalidation endpoint
export const invalidateAgentsCache = () => {
  agentsCache.invalidate('agents:all');
};
```

### Apply to knowledgeService.js

```javascript
// src/services/knowledgeService.js
import { promises as fs } from "fs";
import path from "path";
import { mustExistDir } from "../utils/fsSafe.js";
import { AppError } from "../utils/errors.js";
import { knowledgeCache } from "../utils/cache.js";

export const loadKnowledgeIndex = async () => {
  try {
    // Check cache
    const cached = knowledgeCache.get('knowledge:all');
    if (cached) {
      return cached;
    }

    const dir = path.join(process.cwd(), "data", "knowledge");
    mustExistDir(dir);

    const indexPath = path.join(dir, "index.json");
    const indexContent = await fs.readFile(indexPath, "utf8");
    const index = JSON.parse(indexContent);

    if (!Array.isArray(index.documents)) {
      throw new AppError("Invalid knowledge index.json", 500, "KNOWLEDGE_INDEX_INVALID");
    }

    // PARALLEL reads with error handling
    const documents = await Promise.all(
      index.documents.map(async (f) => {
        const p = path.join(dir, f);
        try {
          const exists = await fs.access(p).then(() => true).catch(() => false);
          return exists ? await fs.readFile(p, "utf8") : "";
        } catch {
          return "";
        }
      })
    );

    // Cache result
    knowledgeCache.set('knowledge:all', documents);
    
    return documents;
  } catch (err) {
    throw new AppError(`Failed to load knowledge: ${err.message}`, 500, err.code || "KNOWLEDGE_LOAD_FAILED");
  }
};
```

---

## 2. Async File I/O Migration

### Update fsSafe.js

```javascript
// src/utils/fsSafe.js
import { promises as fs } from "fs";

export const mustExistDir = async (dirPath) => {
  try {
    const stat = await fs.stat(dirPath);
    if (!stat.isDirectory()) {
      const err = new Error(`Not a directory: ${dirPath}`);
      err.code = "NOT_A_DIRECTORY";
      throw err;
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      const error = new Error(`Directory not found: ${dirPath}`);
      error.code = "DIR_NOT_FOUND";
      throw error;
    }
    throw err;
  }
};

// Keep sync version for scripts if needed
export const mustExistDirSync = (dirPath) => {
  const fs = require('fs');
  if (!fs.existsSync(dirPath)) {
    const err = new Error(`Directory not found: ${dirPath}`);
    err.code = "DIR_NOT_FOUND";
    throw err;
  }
};
```

### Update orchestratorService.js

```javascript
// src/services/orchestratorService.js
import { promises as fs } from "fs";
import path from "path";
import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export const runOrchestration = async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split(".")[0];
    const reportDir = path.join(process.cwd(), "reports");
    const reportFile = path.join(reportDir, `agents-summary-${timestamp}.md`);

    // ASYNC directory creation
    await fs.mkdir(reportDir, { recursive: true });

    logger.info({ timestamp }, "Starting orchestration");

    const results = {
      timestamp,
      architect: null,
      runner: null,
      security: null,
      errors: []
    };

    logger.info({ reportFile }, "Orchestration structure prepared");

    return {
      success: true,
      reportFile,
      timestamp,
      results
    };
  } catch (err) {
    logger.error({ err }, "Orchestration failed");
    throw new AppError(`Orchestration failed: ${err.message}`, 500, "ORCHESTRATION_FAILED");
  }
};

export const saveReport = async (reportFile, content) => {
  await fs.writeFile(reportFile, content, "utf8");
  logger.info({ reportFile }, "Report saved");
};
```

---

## 3. Knowledge Optimization

### Add Knowledge Filtering/Search

```javascript
// src/utils/knowledgeSearch.js (NEW FILE)
export const extractKeywords = (text) => {
  // Remove common words and extract meaningful terms
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 keywords
};

export const searchKnowledge = (knowledge, query, options = {}) => {
  const { limit = 3, minScore = 0.1 } = options;
  
  const keywords = extractKeywords(query);
  
  // Score each knowledge document
  const scored = knowledge.map(doc => {
    const docLower = doc.toLowerCase();
    const score = keywords.reduce((sum, kw) => {
      return sum + (docLower.includes(kw) ? 1 : 0);
    }, 0) / keywords.length;
    
    return { doc, score };
  });
  
  // Return top matches
  return scored
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc }) => doc);
};

export const limitKnowledgeSize = (knowledge, maxChars = 8000) => {
  let total = 0;
  const limited = [];
  
  for (const doc of knowledge) {
    if (total + doc.length > maxChars) break;
    limited.push(doc);
    total += doc.length;
  }
  
  return limited;
};
```

### Update agentRunner.js

```javascript
// src/runners/agentRunner.js
import { loadAgents } from "../services/agentsService.js";
import { loadKnowledgeIndex } from "../services/knowledgeService.js";
import { searchKnowledge, limitKnowledgeSize } from "../utils/knowledgeSearch.js";
import { models } from "../config/models.js";
import { runGPT } from "../services/gptService.js";
import { AppError } from "../utils/errors.js";
import { createFile } from "../actions/githubActions.js";
import { extractIntent, intentToAction } from "../utils/intent.js";
import logger from "../utils/logger.js";

export const runAgent = async ({ agentId, input }) => {
  try {
    // PARALLEL loading
    const [agents, allKnowledge] = await Promise.all([
      loadAgents(),
      loadKnowledgeIndex()
    ]);
    
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new AppError(`Agent not found: ${agentId}`, 404, "AGENT_NOT_FOUND");

    // OPTIMIZED knowledge selection
    const relevantKnowledge = searchKnowledge(allKnowledge, input, { limit: 5 });
    const limitedKnowledge = limitKnowledgeSize(relevantKnowledge, 8000);

    const provider = agent.modelProvider || "openai";
    const keyName = agent.modelKey || "bsm";
    const apiKey = models[provider]?.[keyName] || models[provider]?.default;

    const systemPrompt = `You are ${agent.name}. Role: ${agent.role}. Use the knowledge responsibly.`;
    
    // IMPROVED prompt construction
    const userPrompt = [
      'Knowledge:',
      ...limitedKnowledge,
      '',
      'User Input:',
      input
    ].join('\n');

    const result = await runGPT({
      model: agent.modelName || process.env.OPENAI_MODEL,
      apiKey,
      system: systemPrompt,
      user: userPrompt
    });

    const intent = extractIntent(result);
    const action = intentToAction(intent);
    if (action) {
      const allowedActions = new Set(agent.actions || []);
      if (!allowedActions.has(action)) {
        throw new AppError(`Action not permitted: ${action}`, 403, "ACTION_NOT_ALLOWED");
      }
    }

    if (intent === "create_agent") {
      await createFile(
        "data/agents/new-agent.yaml",
        "id: new-agent\nname: New Agent\nrole: Auto-created\n"
      );
    }

    if (intent === "update_file") {
      throw new AppError("Update file intent not implemented", 501, "UPDATE_FILE_NOT_IMPLEMENTED");
    }

    const output =
      (result !== null && result !== undefined && result !== "") ? result : "لم يصل رد من الوكيل.";

    return { output };
  } catch (err) {
    logger.error({ err, agentId }, "Agent execution failed");
    return { output: "حدث خطأ أثناء تشغيل الوكيل." };
  }
};
```

---

## 4. Connection Pooling

### Update gptService.js

```javascript
// src/services/gptService.js
import fetch from "node-fetch";
import http from "http";
import https from "https";
import { AppError } from "../utils/errors.js";

const API_URL = "https://api.openai.com/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// Connection pooling agents
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

export const runGPT = async ({ model, apiKey, system, user, messages }) => {
  if (!apiKey) throw new AppError("Missing API key for model provider", 500, "MISSING_API_KEY");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const chatMessages = messages || [
    { role: "system", content: system },
    { role: "user", content: user }
  ];

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 1200
      }),
      signal: controller.signal,
      agent: API_URL.startsWith('https://') ? httpsAgent : httpAgent // Use pooling
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new AppError(`GPT request failed: ${text}`, 500, "GPT_ERROR");
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new AppError("GPT request timeout", 500, "GPT_TIMEOUT");
    }
    throw err;
  }
};

// Cleanup on shutdown
process.on('SIGTERM', () => {
  httpAgent.destroy();
  httpsAgent.destroy();
});
```

---

## 5. Monitoring Setup

### Add Performance Middleware

```javascript
// src/middleware/performance.js (NEW FILE)
import logger from "../utils/logger.js";

// Simple in-memory metrics (use Prometheus in production)
const metrics = {
  requests: new Map(),
  errors: new Map(),
  durations: []
};

export const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  const route = `${req.method} ${req.route?.path || req.path}`;

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;

    // Track metrics
    const count = metrics.requests.get(route) || 0;
    metrics.requests.set(route, count + 1);

    if (res.statusCode >= 400) {
      const errorCount = metrics.errors.get(route) || 0;
      metrics.errors.set(route, errorCount + 1);
    }

    metrics.durations.push({
      route,
      duration: durationMs,
      timestamp: Date.now(),
      status: res.statusCode
    });

    // Keep only last 1000 entries
    if (metrics.durations.length > 1000) {
      metrics.durations.shift();
    }

    // Log slow requests
    if (durationMs > 1000) {
      logger.warn({
        correlationId: req.correlationId,
        route,
        durationMs,
        status: res.statusCode
      }, 'Slow request detected');
    }
  });

  next();
};

export const getMetrics = () => {
  const now = Date.now();
  const last5Min = metrics.durations.filter(d => now - d.timestamp < 300000);

  const avgDuration = last5Min.length > 0
    ? last5Min.reduce((sum, d) => sum + d.duration, 0) / last5Min.length
    : 0;

  const p95Duration = last5Min.length > 0
    ? last5Min.sort((a, b) => a.duration - b.duration)[Math.floor(last5Min.length * 0.95)]?.duration || 0
    : 0;

  return {
    totalRequests: Array.from(metrics.requests.values()).reduce((a, b) => a + b, 0),
    totalErrors: Array.from(metrics.errors.values()).reduce((a, b) => a + b, 0),
    avgResponseTime: Math.round(avgDuration),
    p95ResponseTime: Math.round(p95Duration),
    requestsByRoute: Object.fromEntries(metrics.requests),
    errorsByRoute: Object.fromEntries(metrics.errors),
    memoryUsage: process.memoryUsage()
  };
};
```

### Add Metrics Endpoint

```javascript
// src/routes/metrics.js (NEW FILE)
import { Router } from "express";
import { getMetrics } from "../middleware/performance.js";
import { adminAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", adminAuth, (req, res) => {
  const metrics = getMetrics();
  res.json({
    metrics,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
```

### Update app.js

```javascript
// src/app.js
import { performanceMiddleware } from "./middleware/performance.js";
import metricsRoutes from "./routes/metrics.js";

// Add after correlation middleware
app.use(performanceMiddleware);

// Add metrics route
app.use("/api/metrics", metricsRoutes);
```

---

## Migration Checklist

### Phase 1: Quick Wins (Week 1)
- [ ] Implement in-memory caching (`cache.js`)
- [ ] Update `agentsService.js` with cache
- [ ] Update `knowledgeService.js` with cache
- [ ] Add CORS optimization (Set instead of Array)
- [ ] Add connection pooling to `gptService.js`

### Phase 2: Async Migration (Week 2)
- [ ] Update `fsSafe.js` to async
- [ ] Update `orchestratorService.js` to async
- [ ] Update `agentRunner.js` for parallel loading
- [ ] Test all async changes thoroughly

### Phase 3: Knowledge Optimization (Week 3)
- [ ] Implement `knowledgeSearch.js`
- [ ] Update `agentRunner.js` with smart knowledge loading
- [ ] Add limits to chat history in client
- [ ] Test GPT token usage reduction

### Phase 4: Monitoring (Week 4)
- [ ] Implement `performance.js` middleware
- [ ] Add metrics endpoint
- [ ] Set up performance dashboards
- [ ] Configure alerts for slow requests

### Phase 5: Long-term (Month 2+)
- [ ] Evaluate Redis/database migration
- [ ] Implement distributed caching
- [ ] Add request queuing for high load
- [ ] Performance testing and tuning

---

## Testing Commands

```bash
# Before optimization - baseline
npm run start &
sleep 5
npx autocannon -c 10 -d 10 http://localhost:3000/api/agents
npx autocannon -c 10 -d 10 -m POST -H "Content-Type: application/json" \
  -b '{"agentId":"legal-agent","input":"test"}' \
  http://localhost:3000/api/agents/run

# After optimization - comparison
# Run same commands and compare:
# - Requests/sec (should increase 2-3x)
# - Latency avg (should decrease 50-70%)
# - Latency p99 (should decrease 60-80%)

# Memory leak check
node --expose-gc --inspect src/server.js
# Monitor memory over time with load
```

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| `/api/agents` response time | 150ms | 30ms | **80%** |
| `/api/agents/run` response time | 2500ms | 900ms | **64%** |
| Concurrent requests/sec | 50 | 150 | **3x** |
| Memory usage (steady state) | 150MB | 80MB | **47%** |
| GPT API cost per request | $0.008 | $0.003 | **62%** |

---

**Last Updated:** 2025-01-20  
**Maintainer:** BSM Development Team
