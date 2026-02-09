import app from "./app.js";
import { env } from "./config/env.js";
import { validateConfig, ConfigValidationError } from "./config/index.js";
import logger from "./utils/logger.js";

try {
  const result = validateConfig();
  if (result.warnings.length > 0) {
    logger.warn({ warnings: result.warnings }, "Configuration warnings detected");
  }
} catch (error) {
  if (error instanceof ConfigValidationError) {
    logger.error({ errors: error.errors, warnings: error.warnings }, "Configuration validation failed");
    process.exit(1);
  }

  logger.error({ err: error }, "Unexpected startup validation error");
  process.exit(1);
}

app.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "BSU API started");
});
