// Pre-computed error response for production
const PROD_SERVER_ERROR = Object.freeze({
  success: false,
  message: "Server Error",
});

/**
 * Ultra-optimized error handler middleware
 * - Uses pre-computed responses for common errors
 * - Avoids object creation on each error
 * - Minimal processing for better performance
 */
const errorHandler = (err, _, res, next) => {
  // Fast path for headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Extract status code with minimal processing
  const statusCode = err?.statusCode || 500;

  // Fast path for production 500 errors (most common case)
  if (statusCode === 500 && process.env.NODE_ENV !== "dev") {
    return res.status(500).json(PROD_SERVER_ERROR);
  }

  // Fast path for development 500 errors
  if (statusCode === 500 && process.env.NODE_ENV === "dev") {
    return res.status(500).json({
      success: false,
      message: err?.message || "Server Error",
    });
  }

  // Handle other status codes
  return res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "dev"
        ? err?.message || "Server Error"
        : "Server Error",
  });
};

export default errorHandler;
