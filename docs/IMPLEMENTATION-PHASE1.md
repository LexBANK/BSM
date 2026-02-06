# BSM-AgentOS: Phase 1 Implementation Guide

> **Phase**: Foundation (Week 1-2)  
> **Priority**: 🔴 CRITICAL  
> **Sprints**: 1.1 (Database & Core Engine), 1.2 (Security Hub)

---

## Sprint 1.1: Database Layer & Core Engine

### Overview
Establish the foundational data layer and core orchestration engine. This sprint is critical as all other components depend on these systems.

---

## Task 1.1.1: PostgreSQL Database Layer

### Database Schema Design

#### **1. Agents Table**
```sql
-- data/schemas/001_agents.sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    model_provider VARCHAR(50) DEFAULT 'openai',
    model_key VARCHAR(50) DEFAULT 'bsm',
    model_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
    capabilities JSONB DEFAULT '[]',
    actions JSONB DEFAULT '[]',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_agents_agent_id ON agents(agent_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_created_at ON agents(created_at);
```

#### **2. Tasks Table**
```sql
-- data/schemas/002_tasks.sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- execute, train, analyze, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    priority INTEGER DEFAULT 5, -- 1-10 (10 = highest)
    input JSONB NOT NULL,
    output JSONB,
    error TEXT,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 300
);

CREATE INDEX idx_tasks_task_id ON tasks(task_id);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

#### **3. Users Table**
```sql
-- data/schemas/003_users.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- admin, user, viewer
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### **4. Audit Logs Table**
```sql
-- data/schemas/004_audit_logs.sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### **5. ML Models Table**
```sql
-- data/schemas/005_ml_models.sql
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- classification, regression, nlp, etc.
    version VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'training', -- training, deployed, archived
    framework VARCHAR(50), -- tensorflow, pytorch, scikit-learn
    metrics JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deployed_at TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_ml_models_model_id ON ml_models(model_id);
CREATE INDEX idx_ml_models_status ON ml_models(status);
```

#### **6. Agent Executions Table**
```sql
-- data/schemas/006_agent_executions.sql
CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    output TEXT,
    tokens_used INTEGER,
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success', -- success, failure, timeout
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_task_id ON agent_executions(task_id);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at);
```

### Database Models Implementation

#### **Agent Model** (`src/database/models/Agent.js`)
```javascript
import { pool } from '../connection.js';
import { AppError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export class Agent {
  constructor(data) {
    this.id = data.id;
    this.agentId = data.agent_id;
    this.name = data.name;
    this.role = data.role;
    this.description = data.description;
    this.modelProvider = data.model_provider;
    this.modelKey = data.model_key;
    this.modelName = data.model_name;
    this.status = data.status;
    this.capabilities = data.capabilities || [];
    this.actions = data.actions || [];
    this.config = data.config || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
    this.version = data.version;
  }

  static async create(agentData) {
    const query = `
      INSERT INTO agents (agent_id, name, role, description, model_provider, 
                         model_key, model_name, capabilities, actions, config)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        agentData.agentId,
        agentData.name,
        agentData.role,
        agentData.description,
        agentData.modelProvider || 'openai',
        agentData.modelKey || 'bsm',
        agentData.modelName,
        JSON.stringify(agentData.capabilities || []),
        JSON.stringify(agentData.actions || []),
        JSON.stringify(agentData.config || {})
      ]);
      
      logger.info({ agentId: agentData.agentId }, 'Agent created');
      return new Agent(result.rows[0]);
    } catch (error) {
      logger.error({ error, agentId: agentData.agentId }, 'Failed to create agent');
      throw new AppError('Failed to create agent', 500, 'AGENT_CREATE_FAILED');
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM agents WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new Agent(result.rows[0]) : null;
  }

  static async findByAgentId(agentId) {
    const query = 'SELECT * FROM agents WHERE agent_id = $1';
    const result = await pool.query(query, [agentId]);
    return result.rows[0] ? new Agent(result.rows[0]) : null;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM agents WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    return result.rows.map(row => new Agent(row));
  }

  async update(updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramCount}`);
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else if (Array.isArray(value)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(this.id);

    const query = `
      UPDATE agents 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    Object.assign(this, new Agent(result.rows[0]));
    logger.info({ agentId: this.agentId }, 'Agent updated');
    return this;
  }

  async delete() {
    const query = 'DELETE FROM agents WHERE id = $1';
    await pool.query(query, [this.id]);
    logger.info({ agentId: this.agentId }, 'Agent deleted');
  }

  toJSON() {
    return {
      id: this.id,
      agentId: this.agentId,
      name: this.name,
      role: this.role,
      description: this.description,
      modelProvider: this.modelProvider,
      modelKey: this.modelKey,
      modelName: this.modelName,
      status: this.status,
      capabilities: this.capabilities,
      actions: this.actions,
      config: this.config,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }
}
```

#### **Task Model** (`src/database/models/Task.js`)
```javascript
import { pool } from '../connection.js';
import { AppError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export class Task {
  constructor(data) {
    this.id = data.id;
    this.taskId = data.task_id;
    this.agentId = data.agent_id;
    this.type = data.type;
    this.status = data.status;
    this.priority = data.priority;
    this.input = data.input;
    this.output = data.output;
    this.error = data.error;
    this.metadata = data.metadata || {};
    this.startedAt = data.started_at;
    this.completedAt = data.completed_at;
    this.createdAt = data.created_at;
    this.retryCount = data.retry_count;
    this.maxRetries = data.max_retries;
    this.timeoutSeconds = data.timeout_seconds;
  }

  static async create(taskData) {
    const query = `
      INSERT INTO tasks (task_id, agent_id, type, priority, input, metadata, 
                        max_retries, timeout_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [
        taskData.taskId,
        taskData.agentId,
        taskData.type,
        taskData.priority || 5,
        JSON.stringify(taskData.input),
        JSON.stringify(taskData.metadata || {}),
        taskData.maxRetries || 3,
        taskData.timeoutSeconds || 300
      ]);
      
      logger.info({ taskId: taskData.taskId }, 'Task created');
      return new Task(result.rows[0]);
    } catch (error) {
      logger.error({ error, taskId: taskData.taskId }, 'Failed to create task');
      throw new AppError('Failed to create task', 500, 'TASK_CREATE_FAILED');
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new Task(result.rows[0]) : null;
  }

  static async findByStatus(status, limit = 10) {
    const query = `
      SELECT * FROM tasks 
      WHERE status = $1 
      ORDER BY priority DESC, created_at ASC 
      LIMIT $2
    `;
    const result = await pool.query(query, [status, limit]);
    return result.rows.map(row => new Task(row));
  }

  async updateStatus(status, updates = {}) {
    const fields = ['status = $1'];
    const values = [status];
    let paramCount = 2;

    if (status === 'running' && !this.startedAt) {
      fields.push(`started_at = CURRENT_TIMESTAMP`);
    }

    if (status === 'completed' || status === 'failed') {
      fields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (updates.output) {
      fields.push(`output = $${paramCount}`);
      values.push(JSON.stringify(updates.output));
      paramCount++;
    }

    if (updates.error) {
      fields.push(`error = $${paramCount}`);
      values.push(updates.error);
      paramCount++;
    }

    values.push(this.id);

    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    Object.assign(this, new Task(result.rows[0]));
    logger.info({ taskId: this.taskId, status }, 'Task status updated');
    return this;
  }

  async incrementRetry() {
    const query = `
      UPDATE tasks 
      SET retry_count = retry_count + 1
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [this.id]);
    Object.assign(this, new Task(result.rows[0]));
    return this;
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  toJSON() {
    return {
      id: this.id,
      taskId: this.taskId,
      agentId: this.agentId,
      type: this.type,
      status: this.status,
      priority: this.priority,
      input: this.input,
      output: this.output,
      error: this.error,
      metadata: this.metadata,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      timeoutSeconds: this.timeoutSeconds
    };
  }
}
```

### Database Connection (`src/database/connection.js`)
```javascript
import pg from 'pg';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.dbHost || 'localhost',
  port: env.dbPort || 5432,
  database: env.dbName || 'bsm',
  user: env.dbUser || 'bsm_user',
  password: env.dbPassword,
  max: env.dbMaxConnections || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database error');
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error({ error }, 'Database connection test failed');
    return false;
  }
};

export const closePool = async () => {
  await pool.end();
  logger.info('Database connection pool closed');
};
```

### Repository Pattern (`src/database/repositories/agentRepository.js`)
```javascript
import { Agent } from '../models/Agent.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export class AgentRepository {
  static async create(agentData) {
    return await Agent.create(agentData);
  }

  static async findById(id) {
    const agent = await Agent.findById(id);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }
    return agent;
  }

  static async findByAgentId(agentId) {
    const agent = await Agent.findByAgentId(agentId);
    if (!agent) {
      throw new AppError('Agent not found', 404, 'AGENT_NOT_FOUND');
    }
    return agent;
  }

  static async findAll(filters = {}) {
    return await Agent.findAll(filters);
  }

  static async findActive() {
    return await Agent.findAll({ status: 'active' });
  }

  static async update(id, updates) {
    const agent = await this.findById(id);
    return await agent.update(updates);
  }

  static async delete(id) {
    const agent = await this.findById(id);
    await agent.delete();
  }

  static async search(query) {
    // Implement full-text search
    logger.info({ query }, 'Searching agents');
    // TODO: Implement search logic
    return [];
  }
}
```

---

## Task 1.1.2: Redis Caching Layer

### Redis Configuration (`src/database/cache.js`)
```javascript
import { createClient } from 'redis';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: env.redisUrl || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Redis: Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        logger.error({ err }, 'Redis client error');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Redis');
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(value);
      }
      logger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected) return false;
    
    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      logger.debug({ key, ttl }, 'Cache set');
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      logger.debug({ key }, 'Cache deleted');
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Cache exists error');
      return false;
    }
  }

  async flush() {
    if (!this.isConnected) return false;
    
    try {
      await this.client.flushAll();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error({ error }, 'Cache flush error');
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }
}

export const cache = new RedisCache();
```

### Cache Service (`src/services/cacheService.js`)
```javascript
import { cache } from '../database/cache.js';
import logger from '../utils/logger.js';

export class CacheService {
  static CACHE_KEYS = {
    AGENT: (id) => `agent:${id}`,
    AGENTS_LIST: 'agents:list',
    TASK: (id) => `task:${id}`,
    USER: (id) => `user:${id}`,
    METRICS: (type) => `metrics:${type}`
  };

  static CACHE_TTL = {
    SHORT: 300,    // 5 minutes
    MEDIUM: 1800,  // 30 minutes
    LONG: 3600,    // 1 hour
    DAY: 86400     // 24 hours
  };

  static async getAgent(id) {
    return await cache.get(this.CACHE_KEYS.AGENT(id));
  }

  static async setAgent(id, agent, ttl = this.CACHE_TTL.MEDIUM) {
    return await cache.set(this.CACHE_KEYS.AGENT(id), agent, ttl);
  }

  static async invalidateAgent(id) {
    await cache.del(this.CACHE_KEYS.AGENT(id));
    await cache.del(this.CACHE_KEYS.AGENTS_LIST);
  }

  static async getWithFallback(key, fallbackFn, ttl = this.CACHE_TTL.MEDIUM) {
    // Try to get from cache
    let value = await cache.get(key);
    
    if (value !== null) {
      return value;
    }

    // Cache miss - get from source
    try {
      value = await fallbackFn();
      await cache.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error({ error, key }, 'Fallback function failed');
      throw error;
    }
  }

  static async invalidatePattern(pattern) {
    // Note: This requires Redis SCAN command
    logger.info({ pattern }, 'Invalidating cache pattern');
    // TODO: Implement pattern-based invalidation
  }
}
```

[Continues in next file...]
