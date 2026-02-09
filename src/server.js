import app from "./app.js";
import { env } from "./config/env.js";
import logger from "./utils/logger.js";
import { cleanup as cleanupKeyManager } from "./config/smartKeyManager.js";

const server = app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "BSU API started");
});

// Graceful shutdown handler to prevent memory leaks
let shutdownTimeout;

function gracefulShutdown(signal) {
  logger.info({ signal }, "Received shutdown signal, cleaning up...");
  
  server.close(() => {
    logger.info("HTTP server closed");
    
    // Cleanup resources
    cleanupKeyManager();
    
    // Clear the force exit timeout since we shut down gracefully
    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout);
    }
    
    logger.info("Cleanup complete, exiting");
    process.exit(0);
  });
  
  // Force exit after 10 seconds if graceful shutdown fails
  shutdownTimeout = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  gracefulShutdown("unhandledRejection");
});
