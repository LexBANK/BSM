/**
 * BSM-AgentOS Authentication Service
 * JWT-based authentication and session management
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

class AuthService {
  constructor(options = {}) {
    this.options = {
      saltRounds: options.saltRounds || SALT_ROUNDS,
      jwtSecret: options.jwtSecret || JWT_SECRET,
      jwtExpiresIn: options.jwtExpiresIn || JWT_EXPIRES_IN,
      ...options,
    };

    this.sessions = new Map(); // sessionId -> session data
    this.initialized = false;

    // Validate JWT secret in production
    if (process.env.NODE_ENV === "production" && this.options.jwtSecret === "change-me-in-production") {
      throw new Error("JWT_SECRET must be set in production");
    }
  }

  /**
   * Initialize the authentication service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.info("Initializing Authentication Service...");

    // Clean up expired sessions periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Every minute

    this.initialized = true;
    logger.info("Authentication Service initialized");
  }

  /**
   * Hash a password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, this.options.saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload) {
    return jwt.sign(payload, this.options.jwtSecret, {
      expiresIn: this.options.jwtExpiresIn,
    });
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.options.jwtSecret);
    } catch (err) {
      logger.debug({ err }, "Token verification failed");
      return null;
    }
  }

  /**
   * Authenticate a user
   */
  async authenticate(credentials) {
    const { username, password, passwordHash } = credentials;

    if (!username) {
      throw new Error("Username is required");
    }

    // For this implementation, we'll use password hash directly
    // In a real system, you'd look up the user in a database
    if (!passwordHash) {
      throw new Error("Password hash is required");
    }

    // Verify password
    const isValid = await this.comparePassword(password, passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Create session
    const sessionId = uuidv4();
    const token = this.generateToken({
      username,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
    });

    // Store session
    const session = {
      sessionId,
      username,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      lastAccessed: new Date(),
    };

    this.sessions.set(sessionId, session);

    logger.info({ username, sessionId }, "User authenticated");

    return {
      token,
      sessionId,
      username,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Validate a token
   */
  async validateToken(token) {
    const payload = this.verifyToken(token);
    
    if (!payload) {
      return null;
    }

    // Check if session exists
    const session = this.sessions.get(payload.sessionId);
    if (!session) {
      logger.debug({ sessionId: payload.sessionId }, "Session not found");
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      logger.debug({ sessionId: payload.sessionId }, "Session expired");
      this.sessions.delete(payload.sessionId);
      return null;
    }

    // Update last accessed time
    session.lastAccessed = new Date();

    return {
      username: payload.username,
      sessionId: payload.sessionId,
      session,
    };
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      logger.info({ sessionId }, "Session revoked");
      return true;
    }
    return false;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    let count = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      logger.debug({ count }, "Expired sessions cleaned up");
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      activeSessions: this.sessions.size,
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.sessions.clear();
    this.initialized = false;

    logger.info("Authentication Service shut down");
  }
}

export default AuthService;
