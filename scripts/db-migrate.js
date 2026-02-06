/**
 * BSM-AgentOS Database Migration Script
 * Runs SQL schema files in order
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import db from "../data/db.js";
import logger from "../src/utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMAS_DIR = path.join(__dirname, "..", "data", "schemas");

// Get all schema files in order
async function getSchemaFiles() {
  try {
    const files = await fs.readdir(SCHEMAS_DIR);
    return files
      .filter((f) => f.endsWith(".sql"))
      .sort(); // Sorts by filename (001_, 002_, etc.)
  } catch (err) {
    logger.error({ err }, "Failed to read schemas directory");
    throw err;
  }
}

// Run a single migration file
async function runMigration(filename) {
  const filepath = path.join(SCHEMAS_DIR, filename);
  try {
    const sql = await fs.readFile(filepath, "utf8");
    await db.query(sql);
    logger.info({ filename }, "Migration completed");
    return true;
  } catch (err) {
    logger.error({ err, filename }, "Migration failed");
    throw err;
  }
}

// Run all migrations
async function migrateUp() {
  logger.info("Starting database migrations...");
  
  try {
    // Test connection first
    await db.testConnection();
    
    // Get and run all schema files
    const files = await getSchemaFiles();
    logger.info({ count: files.length }, "Found schema files");
    
    for (const file of files) {
      await runMigration(file);
    }
    
    logger.info("All migrations completed successfully");
    return true;
  } catch (err) {
    logger.error({ err }, "Migration process failed");
    throw err;
  }
}

// Rollback (drop all tables)
async function migrateDown() {
  logger.warn("Rolling back all migrations (dropping tables)...");
  
  try {
    await db.query(`
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS knowledge CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS agents CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
      DROP FUNCTION IF EXISTS cleanup_expired_sessions CASCADE;
    `);
    
    logger.info("All tables dropped successfully");
    return true;
  } catch (err) {
    logger.error({ err }, "Rollback failed");
    throw err;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || "up";
  
  (async () => {
    try {
      if (command === "up") {
        await migrateUp();
      } else if (command === "down") {
        await migrateDown();
      } else {
        logger.error({ command }, "Unknown command. Use 'up' or 'down'");
        process.exit(1);
      }
      
      await db.closePool();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Migration script failed");
      await db.closePool();
      process.exit(1);
    }
  })();
}

export { migrateUp, migrateDown, runMigration, getSchemaFiles };
