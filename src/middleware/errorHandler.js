import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  logger.error({
    correlationId: req.correlationId,
    message: err.message,
    code: err.code,
    stack: err.stack
  });

  // Provide clearer client-facing error messages
  let clientMessage = err.message;
  if (status === 500 && !err.code) {
    clientMessage = "Internal Server Error";
  } else if (err.code === "MISSING_API_KEY") {
    clientMessage = "AI service is not configured. Please contact the administrator.";
  }

  res.status(status).json({
    error: clientMessage,
    code: err.code || "INTERNAL_ERROR",
    correlationId: req.correlationId
  });
};
