/**
 * BSM-AgentOS Security Hub
 * Central security management and enforcement
 */

import logger from "../utils/logger.js";
import AuthService from "./authService.js";
import AuditLogger from "./auditLogger.js";
import EncryptionService from "./encryptionService.js";

class SecurityHub {
  constructor(options = {}) {
    this.options = options;
    this.authService = new AuthService(options.auth || {});
    this.auditLogger = new AuditLogger(options.audit || {});
    this.encryptionService = new EncryptionService(options.encryption || {});
    this.initialized = false;

    logger.info("Security Hub created");
  }

  /**
   * Initialize the security hub
   */
  async initialize() {
    if (this.initialized) {
      logger.warn("Security Hub already initialized");
      return;
    }

    logger.info("Initializing Security Hub...");

    try {
      await this.authService.initialize();
      await this.auditLogger.initialize();
      await this.encryptionService.initialize();

      this.initialized = true;
      logger.info("Security Hub initialized successfully");
    } catch (err) {
      logger.error({ err }, "Failed to initialize Security Hub");
      throw err;
    }
  }

  /**
   * Authenticate a user
   */
  async authenticate(credentials) {
    this.ensureInitialized();
    
    try {
      const result = await this.authService.authenticate(credentials);
      
      await this.auditLogger.log({
        action: "user.authenticate",
        resourceType: "authentication",
        status: "success",
        details: { username: credentials.username },
      });

      return result;
    } catch (err) {
      await this.auditLogger.log({
        action: "user.authenticate",
        resourceType: "authentication",
        status: "failed",
        details: { username: credentials.username, error: err.message },
      });

      throw err;
    }
  }

  /**
   * Validate a token
   */
  async validateToken(token) {
    this.ensureInitialized();
    return await this.authService.validateToken(token);
  }

  /**
   * Create a new user
   */
  async createUser(userData) {
    this.ensureInitialized();
    
    try {
      // Hash password
      const hashedPassword = await this.authService.hashPassword(userData.password);
      
      const user = {
        ...userData,
        password_hash: hashedPassword,
      };

      await this.auditLogger.log({
        action: "user.create",
        resourceType: "user",
        status: "success",
        details: { username: userData.username, role: userData.role },
      });

      return user;
    } catch (err) {
      await this.auditLogger.log({
        action: "user.create",
        resourceType: "user",
        status: "failed",
        details: { error: err.message },
      });

      throw err;
    }
  }

  /**
   * Log an audit event
   */
  async audit(event) {
    this.ensureInitialized();
    return await this.auditLogger.log(event);
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    this.ensureInitialized();
    return this.encryptionService.encrypt(data);
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    this.ensureInitialized();
    return this.encryptionService.decrypt(encryptedData);
  }

  /**
   * Get security status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      auth: this.authService.getStatus(),
      audit: this.auditLogger.getStatus(),
      encryption: this.encryptionService.getStatus(),
    };
  }

  /**
   * Shutdown the security hub
   */
  async shutdown() {
    logger.info("Shutting down Security Hub...");

    await this.authService.shutdown();
    await this.auditLogger.shutdown();
    await this.encryptionService.shutdown();

    this.initialized = false;
    logger.info("Security Hub shut down");
  }

  /**
   * Ensure the hub is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error("Security Hub is not initialized");
    }
  }
}

// Singleton instance
let securityHubInstance = null;

export function getSecurityHub(options = {}) {
  if (!securityHubInstance) {
    securityHubInstance = new SecurityHub(options);
  }
  return securityHubInstance;
}

export default SecurityHub;
