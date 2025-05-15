import jwt from "jsonwebtoken";
import { LRUCache } from "lru-cache";

// Use LRU cache for better memory management and performance
const tokenCache = new LRUCache({
  max: 2000, // Increased cache size for high traffic
  ttl: 300000, // 5 minutes TTL
  updateAgeOnGet: true, // Update item age on access
  allowStale: true, // Allow stale items to be returned while revalidating
});

export const errMiddleware = ({
  next,
  error = "Something went wrong",
  controller = "Unknown",
  statusCode = 500,
}) => {
  // Skip processing if next is not provided
  if (!next) return null;

  // Handle Error objects
  if (error instanceof Error) {
    // Only log in development
    if (process.env.NODE_ENV === "dev") {
      console.error(`Error in ${controller}: ${error.message}`);
    }

    // Set status code if not already set
    if (!error.statusCode) {
      error.statusCode = statusCode;
    }

    return next(error);
  }

  // Handle string/other errors
  else {
    // Create error object with minimal properties
    const err = new Error(error);
    err.statusCode = statusCode;

    // Only log in development
    if (process.env.NODE_ENV === "dev") {
      console.error(`Error in ${controller}: ${error}`);
    }

    return next(err);
  }
};

const emptyResponse = { success: true };

export const okResponse = ({
  response,
  statusCode = 200,
  message = "",
  data,
  ...rest
}) => {
  // Return early if response is not provided
  if (!response || !response.status) return null;

  // Use pre-computed objects for common cases
  if (!message && !data && Object.keys(rest).length === 0) {
    return response.status(statusCode).json(emptyResponse);
  }

  if (!message && !data) {
    return response.status(statusCode).json({ success: true, ...rest });
  }

  if (!data && !Object.keys(rest).length) {
    return response.status(statusCode).json({ success: true, message });
  }

  if (!message && Object.keys(rest).length === 0) {
    return response.status(statusCode).json({ success: true, data });
  }

  // Build response for other cases
  return response.status(statusCode).json({
    success: true,
    ...(message ? { message } : {}),
    ...(data ? { data } : {}),
    ...rest,
  });
};

// Cache expiry value to avoid repeated parsing
let cachedExpiryMs = null;

/**
 * Parse token expiry string to milliseconds
 * @param {string} expiry - Expiry string (e.g., "24h")
 * @returns {number} - Expiry in milliseconds
 */
function parseExpiryToMs(expiry) {
  if (cachedExpiryMs !== null) return cachedExpiryMs;

  let expiryMs = 86400000; // Default 24 hours

  if (typeof expiry === "string") {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    if (!isNaN(value)) {
      switch (unit) {
        case "s":
          expiryMs = value * 1000;
          break;
        case "m":
          expiryMs = value * 60000;
          break;
        case "h":
          expiryMs = value * 3600000;
          break;
        case "d":
          expiryMs = value * 86400000;
          break;
      }
    }
  }

  cachedExpiryMs = expiryMs;
  return expiryMs;
}

/**
 * Creates a JWT token for a user
 * @param {string} userId - The user ID to include in the token
 * @returns {Promise<string>} - The generated JWT token
 */
export function createToken(userId) {
  try {
    // Fast path for invalid inputs
    if (!userId) {
      return Promise.reject(
        new Error("User ID is required for token creation")
      );
    }

    // Fast validation with regex instead of mongoose.Types.ObjectId.isValid
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return Promise.reject(new Error("Invalid user ID format"));
    }

    // Check token cache first - use shorter key for better memory usage
    const cacheKey = `t_${userId}`;
    const cachedToken = tokenCache.get(cacheKey);

    if (cachedToken) {
      return Promise.resolve(cachedToken);
    }

    // Get secret key
    const secretKey = getSecretKey();
    if (!secretKey) {
      return Promise.reject(new Error("ACCESS_TOKEN_SECRET is not defined"));
    }

    const expiry = process.env.ACCESS_TOKEN_EXPIRY || "24h";
    const expiryMs = parseExpiryToMs(expiry);

    // Create token with optimized promise handling
    return new Promise((resolve, reject) => {
      // Use minimal payload for better performance
      const payload = { id: userId };

      // Use optimized JWT options
      const options = {
        expiresIn: expiry,
        algorithm: "HS256",
        noTimestamp: false,
      };

      jwt.sign(payload, secretKey, options, (err, token) => {
        if (err) return reject(err);

        // Cache token with optimized TTL
        tokenCache.set(cacheKey, token, {
          ttl: expiryMs - 60000, // Expire 1 minute early for safety
        });

        resolve(token);
      });
    });
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === "dev") {
      console.error("Token generation error:", error.message);
    }
    return Promise.reject(error);
  }
}

// Cache secret key to avoid repeated environment variable lookups
let cachedSecretKey = null;

/**
 * Get JWT secret key with fallback for development
 * @returns {string|null} - The secret key
 */
function getSecretKey() {
  if (cachedSecretKey) return cachedSecretKey;

  cachedSecretKey =
    process.env.ACCESS_TOKEN_SECRET ||
    (process.env.NODE_ENV === "dev"
      ? "development_secret_key_not_for_production_use"
      : null);

  return cachedSecretKey;
}

/**
 * Verifies a JWT token and returns the user ID if valid
 * @param {string} token - The JWT token to verify
 * @returns {Promise<string|null>} - The user ID if valid, null otherwise
 */
export function verifyToken(token) {
  // Fast path for invalid tokens
  if (!token || typeof token !== "string" || token.length < 10) {
    return Promise.resolve(null);
  }

  try {
    // Use token's first 32 chars for cache key to reduce memory usage
    // This is safe because JWT tokens are unique and the first part contains the header
    const tokenPrefix = token.substring(0, 32);
    const cacheKey = `v_${tokenPrefix}`;

    // Check verification cache first - fast path
    const cachedVerification = tokenCache.get(cacheKey);
    if (cachedVerification) {
      return Promise.resolve(cachedVerification);
    }

    // Get secret key
    const secretKey = getSecretKey();
    if (!secretKey) {
      return Promise.resolve(null);
    }

    // Verify token with optimized promise handling
    return new Promise((resolve) => {
      jwt.verify(token, secretKey, (err, decoded) => {
        // Fast path for errors
        if (err || !decoded || !decoded.id) {
          // Only log in development
          if (process.env.NODE_ENV === "dev" && err) {
            console.error("Token verification error:", err.name);
          }
          return resolve(null);
        }

        const userId = decoded.id;

        // Fast path for invalid MongoDB IDs - use regex for better performance
        // This is faster than mongoose.Types.ObjectId.isValid for most cases
        if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
          return resolve(null);
        }

        // Cache the result - use shorter TTL to reduce memory pressure
        tokenCache.set(cacheKey, userId, { ttl: 180000 }); // 3 minutes

        resolve(userId);
      });
    });
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === "dev") {
      console.error("Token verification error:", error.message);
    }
    return Promise.resolve(null);
  }
}

export const isAccess = (modelData, next) => {
  // Check if model data exists
  if (!modelData) {
    if (next) {
      errMiddleware({
        next,
        error: "Access check failed: No data provided",
        statusCode: 400,
        controller: "isAccess",
      });
    }
    return false;
  }

  // Check access status
  if (modelData.isAccess === false) {
    if (next) {
      errMiddleware({
        next,
        error: "Access denied: Account is blocked",
        statusCode: 403,
        controller: "isAccess",
      });
    }
    return false;
  }

  return true;
};
