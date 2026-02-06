/**
 * BSM-AgentOS Test Suite
 * Unit tests for Security Hub
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import SecurityHub from "../../../src/security/securityHub.js";

describe("Security Hub", () => {
  let securityHub;

  beforeEach(() => {
    securityHub = new SecurityHub({
      auth: {
        jwtSecret: "test-secret-for-testing-only",
        jwtExpiresIn: "1h",
      },
    });
  });

  afterEach(async () => {
    if (securityHub && securityHub.initialized) {
      await securityHub.shutdown();
    }
  });

  describe("Initialization", () => {
    it("should create security hub", () => {
      expect(securityHub).toBeDefined();
      expect(securityHub.authService).toBeDefined();
      expect(securityHub.auditLogger).toBeDefined();
      expect(securityHub.encryptionService).toBeDefined();
    });

    it("should initialize successfully", async () => {
      await securityHub.initialize();
      expect(securityHub.initialized).toBe(true);
    });

    it("should not initialize twice", async () => {
      await securityHub.initialize();
      await securityHub.initialize(); // Second call
      expect(securityHub.initialized).toBe(true);
    });
  });

  describe("Authentication", () => {
    beforeEach(async () => {
      await securityHub.initialize();
    });

    it("should hash passwords", async () => {
      const password = "test-password";
      const hashedPassword = await securityHub.authService.hashPassword(password);
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(30);
    });

    it("should compare passwords correctly", async () => {
      const password = "test-password";
      const hashedPassword = await securityHub.authService.hashPassword(password);
      const isValid = await securityHub.authService.comparePassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it("should reject wrong password", async () => {
      const password = "test-password";
      const hashedPassword = await securityHub.authService.hashPassword(password);
      const isValid = await securityHub.authService.comparePassword("wrong-password", hashedPassword);
      expect(isValid).toBe(false);
    });

    it("should generate JWT tokens", () => {
      const payload = { username: "testuser" };
      const token = securityHub.authService.generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should verify JWT tokens", () => {
      const payload = { username: "testuser" };
      const token = securityHub.authService.generateToken(payload);
      const decoded = securityHub.authService.verifyToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.username).toBe("testuser");
    });
  });

  describe("Encryption", () => {
    beforeEach(async () => {
      await securityHub.initialize();
    });

    it("should encrypt data", () => {
      const data = "sensitive information";
      const encrypted = securityHub.encrypt(data);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(data);
    });

    it("should decrypt data", () => {
      const data = "sensitive information";
      const encrypted = securityHub.encrypt(data);
      const decrypted = securityHub.decrypt(encrypted);
      expect(decrypted).toBe(data);
    });

    it("should encrypt and decrypt objects", () => {
      const data = { secret: "value", number: 42 };
      const encrypted = securityHub.encrypt(data);
      const decrypted = securityHub.decrypt(encrypted);
      expect(decrypted).toEqual(data);
    });

    it("should hash data", () => {
      const data = "test data";
      const hash = securityHub.encryptionService.hash(data);
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });
  });

  describe("Audit Logging", () => {
    beforeEach(async () => {
      await securityHub.initialize();
    });

    it("should log audit events", async () => {
      const event = {
        action: "test.action",
        resourceType: "test",
        status: "success",
      };
      
      const logged = await securityHub.audit(event);
      expect(logged).toBeDefined();
      expect(logged.id).toBeDefined();
    });

    it("should retrieve audit logs", async () => {
      await securityHub.audit({
        action: "test.action",
        resourceType: "test",
        status: "success",
      });

      const logs = await securityHub.auditLogger.getRecentLogs(10);
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe("Status", () => {
    it("should return status", async () => {
      await securityHub.initialize();
      const status = securityHub.getStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.auth).toBeDefined();
      expect(status.audit).toBeDefined();
      expect(status.encryption).toBeDefined();
    });
  });
});
