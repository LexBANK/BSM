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
  
  // Handle specific error codes with user-friendly messages
  if (err.code === "MISSING_API_KEY") {
    clientMessage = "AI service is not configured. Please contact the administrator.";
  } else if (status === 500) {
    // For all other 500 errors, use generic message
    clientMessage = "Internal Server Error";
  }

  res.status(status).json({
    error: clientMessage,
    code: err.code || "INTERNAL_ERROR",
    correlationId: req.correlationId
  });
};
