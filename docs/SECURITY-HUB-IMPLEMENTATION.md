# Security Hub Implementation Guide

> **Component**: Security Hub  
> **Priority**: 🔴 CRITICAL  
> **Dependencies**: Database Layer, Core Engine

---

## Overview

The Security Hub is the central security management system for BSM-AgentOS. It handles authentication, authorization, secrets management, audit logging, compliance, and threat detection.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Security Hub                            │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Central Security Controller               │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│   ┌──────────┬─────────────┼─────────────┬───────────────┐  │
│   │          │              │             │               │  │
│   ▼          ▼              ▼             ▼               ▼  │
│  ┌───────┐ ┌───────┐ ┌───────────┐ ┌──────────┐ ┌────────┐ │
│  │ Vault │ │ Audit │ │Compliance │ │Encryption│ │ Threat │ │
│  │  Mgmt │ │  Log  │ │  Checker  │ │          │ │Detector│ │
│  └───────┘ └───────┘ └───────────┘ └──────────┘ └────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## Component 1: Security Hub Core

### File: `src/security/hub.js`

```javascript
import { VaultClient } from './vault/vaultClient.js';
import { AuditLogger } from './audit/auditLogger.js';
import { ComplianceChecker } from './compliance/complianceChecker.js';
import { CryptoService } from './encryption/crypto.js';
import { ThreatDetector } from './threatDetection/detector.js';
import { AuthService } from './auth/authService.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

/**
 * Security Hub - Central security management system
 */
export class SecurityHub {
  constructor(config = {}) {
    this.config = {
      vaultEnabled: config.vaultEnabled !== false,
      auditEnabled: config.auditEnabled !== false,
      complianceEnabled: config.complianceEnabled !== false,
      threatDetectionEnabled: config.threatDetectionEnabled !== false,
      ...config
    };

    this.vault = null;
    this.auditLogger = null;
    this.complianceChecker = null;
    this.cryptoService = null;
    this.threatDetector = null;
    this.authService = null;
    
    this.initialized = false;
  }

  /**
   * Initialize Security Hub
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Security Hub already initialized');
      return;
    }

    try {
      logger.info('Initializing Security Hub...');

      // 1. Initialize Crypto Service (required by others)
      logger.info('Initializing Crypto Service...');
      this.cryptoService = new CryptoService();
      await this.cryptoService.initialize();

      // 2. Initialize Vault (if enabled)
      if (this.config.vaultEnabled) {
        logger.info('Initializing Vault Client...');
        this.vault = new VaultClient(this.config.vault);
        await this.vault.initialize();
      }

      // 3. Initialize Audit Logger
      if (this.config.auditEnabled) {
        logger.info('Initializing Audit Logger...');
        this.auditLogger = new AuditLogger();
        await this.auditLogger.initialize();
      }

      // 4. Initialize Compliance Checker
      if (this.config.complianceEnabled) {
        logger.info('Initializing Compliance Checker...');
        this.complianceChecker = new ComplianceChecker();
        await this.complianceChecker.initialize();
      }

      // 5. Initialize Threat Detector
      if (this.config.threatDetectionEnabled) {
        logger.info('Initializing Threat Detector...');
        this.threatDetector = new ThreatDetector();
        await this.threatDetector.initialize();
      }

      // 6. Initialize Auth Service
      logger.info('Initializing Auth Service...');
      this.authService = new AuthService({
        cryptoService: this.cryptoService,
        auditLogger: this.auditLogger
      });
      await this.authService.initialize();

      this.initialized = true;
      logger.info('✅ Security Hub initialized successfully');
      
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Security Hub');
      throw error;
    }
  }

  /**
   * Authenticate middleware
   */
  authenticate = async (req, res, next) => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        throw new AppError('No authentication token provided', 401, 'NO_TOKEN');
      }

      const user = await this.authService.verifyToken(token);
      req.user = user;

      // Log authentication
      if (this.auditLogger) {
        await this.auditLogger.logAuthentication(user.id, req);
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Authentication failed');
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }
  };

  /**
   * Authorize middleware
   */
  authorize = (requiredPermission) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
        }

        const hasPermission = await this.authService.checkPermission(
          req.user.id,
          requiredPermission
        );

        if (!hasPermission) {
          // Log authorization failure
          if (this.auditLogger) {
            await this.auditLogger.logAuthorizationFailure(
              req.user.id,
              requiredPermission,
              req
            );
          }

          throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
        }

        // Log authorization success
        if (this.auditLogger) {
          await this.auditLogger.logAuthorization(
            req.user.id,
            requiredPermission,
            req
          );
        }

        next();
      } catch (error) {
        logger.error({ error }, 'Authorization failed');
        res.status(error.statusCode || 403).json({
          error: 'Authorization failed',
          message: error.message
        });
      }
    };
  };

  /**
   * Extract token from request
   */
  extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check custom headers
    if (req.headers['x-auth-token']) {
      return req.headers['x-auth-token'];
    }

    // Check cookies
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Get or create secret
   */
  async getSecret(key) {
    if (!this.vault) {
      throw new AppError('Vault not enabled', 500, 'VAULT_NOT_ENABLED');
    }
    return await this.vault.getSecret(key);
  }

  async setSecret(key, value) {
    if (!this.vault) {
      throw new AppError('Vault not enabled', 500, 'VAULT_NOT_ENABLED');
    }
    return await this.vault.setSecret(key, value);
  }

  /**
   * Log audit event
   */
  async logAudit(event) {
    if (!this.auditLogger) {
      return;
    }
    return await this.auditLogger.log(event);
  }

  /**
   * Check compliance
   */
  async checkCompliance(type) {
    if (!this.complianceChecker) {
      return { compliant: true, message: 'Compliance checking disabled' };
    }
    return await this.complianceChecker.check(type);
  }

  /**
   * Detect threats
   */
  async detectThreats(req) {
    if (!this.threatDetector) {
      return { threats: [] };
    }
    return await this.threatDetector.analyze(req);
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    return this.cryptoService.encrypt(data);
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    return this.cryptoService.decrypt(encryptedData);
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return await this.authService.hashPassword(password);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    return await this.authService.verifyPassword(password, hash);
  }

  /**
   * Get security status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      components: {
        vault: this.vault?.isConnected() || false,
        auditLogger: this.auditLogger !== null,
        complianceChecker: this.complianceChecker !== null,
        threatDetector: this.threatDetector !== null,
        authService: this.authService !== null
      }
    };
  }

  /**
   * Get security metrics
   */
  async getMetrics() {
    const metrics = {
      authentication: await this.authService?.getMetrics() || {},
      audit: await this.auditLogger?.getMetrics() || {},
      compliance: await this.complianceChecker?.getMetrics() || {},
      threats: await this.threatDetector?.getMetrics() || {}
    };

    return metrics;
  }
}

// Singleton instance
let securityHubInstance = null;

export const getSecurityHub = (config) => {
  if (!securityHubInstance) {
    securityHubInstance = new SecurityHub(config);
  }
  return securityHubInstance;
};
```

---

## Component 2: Authentication Service

### File: `src/security/auth/authService.js`

```javascript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';
import { pool } from '../../database/connection.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export class AuthService {
  constructor({ cryptoService, auditLogger }) {
    this.cryptoService = cryptoService;
    this.auditLogger = auditLogger;
    this.jwtSecret = env.jwtSecret || 'change-me-in-production';
    this.jwtExpiry = env.jwtExpiry || '24h';
    this.initialized = false;
  }

  async initialize() {
    logger.info('Initializing Auth Service...');
    
    // Validate JWT secret in production
    if (process.env.NODE_ENV === 'production' && this.jwtSecret === 'change-me-in-production') {
      throw new AppError('JWT secret must be set in production', 500, 'INVALID_JWT_SECRET');
    }

    this.initialized = true;
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      issuer: 'bsm-agentos',
      audience: 'bsm-api'
    });
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'bsm-agentos',
        audience: 'bsm-api'
      });

      // Check if user still exists and is active
      const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
      const result = await pool.query(query, [decoded.id]);

      if (result.rows.length === 0) {
        throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
      }

      return result.rows[0];
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * Check user permission
   */
  async checkPermission(userId, requiredPermission) {
    // Get user role
    const query = 'SELECT role FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const userRole = result.rows[0].role;

    // Define role permissions
    const permissions = {
      admin: ['*'], // Admin has all permissions
      user: ['agent:run', 'agent:list', 'task:create', 'task:view'],
      viewer: ['agent:list', 'task:view']
    };

    const userPermissions = permissions[userRole] || [];

    // Check if user has required permission
    return userPermissions.includes('*') || userPermissions.includes(requiredPermission);
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password) {
    try {
      // Find user
      const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
      const result = await pool.query(query, [username]);

      if (result.rows.length === 0) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await this.verifyPassword(password, user.password_hash);

      if (!isValid) {
        // Log failed attempt
        if (this.auditLogger) {
          await this.auditLogger.logAuthenticationFailure(username);
        }
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Update last login
      await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      // Generate token
      const token = this.generateToken(user);

      // Log successful authentication
      if (this.auditLogger) {
        await this.auditLogger.logAuthenticationSuccess(user.id);
      }

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      };
    } catch (error) {
      logger.error({ error, username }, 'Authentication failed');
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Insert user
      const query = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, role, created_at
      `;

      const result = await pool.query(query, [
        userData.username,
        userData.email,
        passwordHash,
        userData.role || 'user'
      ]);

      const user = result.rows[0];

      // Log registration
      if (this.auditLogger) {
        await this.auditLogger.logUserRegistration(user.id);
      }

      logger.info({ userId: user.id, username: user.username }, 'User registered');

      return user;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new AppError('Username or email already exists', 400, 'USER_EXISTS');
      }
      throw error;
    }
  }

  /**
   * Get metrics
   */
  async getMetrics() {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'user') as users,
        COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '24 hours') as recent_logins
      FROM users
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}
```

---

## Component 3: Audit Logger

### File: `src/security/audit/auditLogger.js`

```javascript
import { pool } from '../../database/connection.js';
import logger from '../../utils/logger.js';

export class AuditLogger {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    logger.info('Initializing Audit Logger...');
    this.initialized = true;
  }

  /**
   * Log audit event
   */
  async log(event) {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const result = await pool.query(query, [
        event.userId || null,
        event.action,
        event.resourceType,
        event.resourceId || null,
        JSON.stringify(event.details || {}),
        event.ipAddress || null,
        event.userAgent || null
      ]);

      logger.debug({ auditId: result.rows[0].id, action: event.action }, 'Audit event logged');
      return result.rows[0].id;
    } catch (error) {
      logger.error({ error, event }, 'Failed to log audit event');
      // Don't throw - audit logging should not break application flow
    }
  }

  /**
   * Log authentication event
   */
  async logAuthentication(userId, req) {
    return await this.log({
      userId,
      action: 'user:authenticate',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  /**
   * Log authentication failure
   */
  async logAuthenticationFailure(username) {
    return await this.log({
      action: 'user:authenticate:failed',
      resourceType: 'user',
      details: { username }
    });
  }

  /**
   * Log authentication success
   */
  async logAuthenticationSuccess(userId) {
    return await this.log({
      userId,
      action: 'user:authenticate:success',
      resourceType: 'user',
      resourceId: userId
    });
  }

  /**
   * Log authorization
   */
  async logAuthorization(userId, permission, req) {
    return await this.log({
      userId,
      action: 'user:authorize',
      resourceType: 'permission',
      details: { permission },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  /**
   * Log authorization failure
   */
  async logAuthorizationFailure(userId, permission, req) {
    return await this.log({
      userId,
      action: 'user:authorize:failed',
      resourceType: 'permission',
      details: { permission },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  /**
   * Log user registration
   */
  async logUserRegistration(userId) {
    return await this.log({
      userId,
      action: 'user:register',
      resourceType: 'user',
      resourceId: userId
    });
  }

  /**
   * Log agent action
   */
  async logAgentAction(userId, agentId, action, details) {
    return await this.log({
      userId,
      action: `agent:${action}`,
      resourceType: 'agent',
      resourceId: agentId,
      details
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(userId, resourceType, resourceId, action) {
    return await this.log({
      userId,
      action: `data:${action}`,
      resourceType,
      resourceId
    });
  }

  /**
   * Get audit logs
   */
  async getLogs(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.userId) {
      query += ` AND user_id = $${paramCount}`;
      params.push(filters.userId);
      paramCount++;
    }

    if (filters.action) {
      query += ` AND action = $${paramCount}`;
      params.push(filters.action);
      paramCount++;
    }

    if (filters.resourceType) {
      query += ` AND resource_type = $${paramCount}`;
      params.push(filters.resourceType);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.endDate);
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
    return result.rows;
  }

  /**
   * Get audit metrics
   */
  async getMetrics() {
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as events_24h,
        COUNT(*) FILTER (WHERE action LIKE 'user:authenticate%') as authentications,
        COUNT(*) FILTER (WHERE action LIKE '%:failed') as failed_events
      FROM audit_logs
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}
```

---

## Component 4: Encryption Service

### File: `src/security/encryption/crypto.js`

```javascript
import crypto from 'crypto';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export class CryptoService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.encryptionKey = null;
    this.initialized = false;
  }

  async initialize() {
    logger.info('Initializing Crypto Service...');

    // Get encryption key from environment
    const keyString = env.encryptionKey || this.generateKey();
    
    // Convert key to buffer
    this.encryptionKey = Buffer.from(keyString, 'hex');

    if (this.encryptionKey.length !== 32) {
      throw new AppError('Encryption key must be 32 bytes (256 bits)', 500, 'INVALID_ENCRYPTION_KEY');
    }

    this.initialized = true;
  }

  /**
   * Generate a new encryption key
   */
  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt data
   */
  encrypt(plaintext) {
    try {
      // Generate IV
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Return combined result
      return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      logger.error({ error }, 'Encryption failed');
      throw new AppError('Encryption failed', 500, 'ENCRYPTION_FAILED');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    try {
      // Extract components
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error({ error }, 'Decryption failed');
      throw new AppError('Decryption failed', 500, 'DECRYPTION_FAILED');
    }
  }

  /**
   * Hash data (one-way)
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Constant-time string comparison
   */
  constantTimeCompare(a, b) {
    return crypto.timingSafeEqual(
      Buffer.from(a),
      Buffer.from(b)
    );
  }
}
```

[Security Hub implementation continues with Compliance Checker, Threat Detector, and Vault Client in separate files...]
