/**
 * BSM-AgentOS Encryption Service
 * AES-256-GCM encryption for sensitive data
 */

import crypto from "crypto";
import logger from "../utils/logger.js";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class EncryptionService {
  constructor(options = {}) {
    this.options = options;
    
    // Get encryption key from environment or generate one
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
      this.encryptionKey = Buffer.from(envKey, "hex");
      if (this.encryptionKey.length !== KEY_LENGTH) {
        throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters`);
      }
    } else {
      // Generate a random key (only for development!)
      this.encryptionKey = crypto.randomBytes(KEY_LENGTH);
      
      if (process.env.NODE_ENV === "production") {
        logger.error("ENCRYPTION_KEY not set in production!");
        throw new Error("ENCRYPTION_KEY must be set in production");
      }
      
      logger.warn({ key: this.encryptionKey.toString("hex") }, "Using generated encryption key (development only)");
    }

    this.initialized = false;
  }

  /**
   * Initialize the encryption service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.info("Initializing Encryption Service...");
    this.initialized = true;
    logger.info("Encryption Service initialized");
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    if (!this.initialized) {
      throw new Error("Encryption Service is not initialized");
    }

    try {
      // Convert data to string if needed
      const plaintext = typeof data === "string" ? data : JSON.stringify(data);

      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine IV + auth tag + encrypted data
      const result = {
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        encrypted: encrypted,
      };

      return JSON.stringify(result);
    } catch (err) {
      logger.error({ err }, "Encryption failed");
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    if (!this.initialized) {
      throw new Error("Encryption Service is not initialized");
    }

    try {
      // Parse encrypted data
      const data = JSON.parse(encryptedData);
      const { iv, authTag, encrypted } = data;

      // Convert from hex
      const ivBuffer = Buffer.from(iv, "hex");
      const authTagBuffer = Buffer.from(authTag, "hex");

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, ivBuffer);
      decipher.setAuthTag(authTagBuffer);

      // Decrypt
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      // Try to parse as JSON, otherwise return as string
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      logger.error({ err }, "Decryption failed");
      throw new Error("Decryption failed");
    }
  }

  /**
   * Generate a random key (for key rotation)
   */
  static generateKey() {
    const key = crypto.randomBytes(KEY_LENGTH);
    return key.toString("hex");
  }

  /**
   * Hash data (one-way)
   */
  hash(data) {
    const plaintext = typeof data === "string" ? data : JSON.stringify(data);
    return crypto.createHash("sha256").update(plaintext).digest("hex");
  }

  /**
   * Generate HMAC
   */
  hmac(data, secret) {
    const plaintext = typeof data === "string" ? data : JSON.stringify(data);
    const hmacSecret = secret || this.encryptionKey;
    return crypto.createHmac("sha256", hmacSecret).update(plaintext).digest("hex");
  }

  /**
   * Verify HMAC
   */
  verifyHmac(data, hmac, secret) {
    const calculatedHmac = this.hmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(calculatedHmac)
    );
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      algorithm: ALGORITHM,
      keyLength: KEY_LENGTH * 8, // in bits
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    // Clear the encryption key from memory
    if (this.encryptionKey) {
      this.encryptionKey.fill(0);
    }

    this.initialized = false;
    logger.info("Encryption Service shut down");
  }
}

export default EncryptionService;
