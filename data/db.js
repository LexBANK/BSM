/**
 * BSM-AgentOS Database Configuration
 * PostgreSQL connection pool and client management
 */

import pg from "pg";
import { config } from "../src/config/env.js";
import logger from "../src/utils/logger.js";

const { Pool } = pg;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "bsm_agentos",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: parseInt(process.env.DB_POOL_MAX || "20", 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10),
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database pool error");
  process.exit(-1);
});

// Test connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    logger.info({ time: result.rows[0].now }, "Database connection successful");
    return true;
  } catch (err) {
    logger.error({ err }, "Database connection failed");
    throw err;
  }
}

// Query helper with error handling
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: result.rowCount }, "Executed query");
    return result;
  } catch (err) {
    logger.error({ err, text }, "Query error");
    throw err;
  }
}

// Transaction helper
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err }, "Transaction rolled back");
    throw err;
  } finally {
    client.release();
  }
}

// Get a client from the pool
export async function getClient() {
  return await pool.connect();
}

// Close all connections
export async function closePool() {
  await pool.end();
  logger.info("Database pool closed");
}

export default {
  query,
  transaction,
  getClient,
  testConnection,
  closePool,
  pool,
};
