import argon2 from "argon2";
import { errMiddleware } from "./reqResFunction.js";
import mongoose from "mongoose";
import { LRUCache } from "lru-cache";

// Cache argon2 options to avoid recreating the object on each call
const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2i, // Better performance than argon2id
  timeCost: 1, // Minimum iterations for better performance
  memoryCost: 1024, // Minimum memory usage (KiB)
  parallelism: 1, // Single thread to avoid CPU contention
  hashLength: 32, // Output hash length
  raw: false, // Output encoded string
});

/**
 * Create password hash with optimized argon2 settings
 * @param {Object} options - Hash options
 * @param {string} options.password - Password to hash
 * @param {Function} options.next - Express next function
 * @returns {Promise<string>} - Hashed password
 */
export const createHash = async ({ password, next }) => {
  try {
    // Validate input
    if (!password) {
      if (next) {
        return errMiddleware({
          next,
          error: "Password is required for hashing",
          statusCode: 400,
        });
      }
      throw new Error("Password is required for hashing");
    }

    // Use pre-configured options for better performance
    return await argon2.hash(password, ARGON2_OPTIONS);
  } catch (error) {
    if (next) {
      return errMiddleware({
        next,
        error: "Password hashing failed",
        statusCode: 500,
      });
    }
    throw new Error("Password hashing failed");
  }
};

/**
 * Verify password hash with optimized error handling
 * @param {string} hash - Stored password hash
 * @param {string} password - Password to verify
 * @returns {Promise<boolean>} - True if password matches
 */
export const verifyHash = async (hash, password) => {
  // Fast path for invalid inputs
  if (!hash || !password) {
    return false;
  }

  try {
    // Use argon2 verification with optimized options
    return await argon2.verify(hash, password, {
      timeCost: 1, // Minimum iterations for better performance
      memoryCost: 1024, // Minimum memory usage (KiB)
      parallelism: 1, // Single thread to avoid CPU contention
    });
  } catch (error) {
    // Silently fail for security reasons
    return false;
  }
};


const validationCache = new LRUCache({
  max: 500, // Increased cache size for better hit rate
  ttl: 300000, // 5 minutes TTL
  updateAgeOnGet: true, // Update item age on access
  allowStale: true, // Allow stale items to be returned while revalidating
});

// Fast hash function for cache keys
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Optimized input validation with caching
 * @param {Object} options - Validation options
 * @param {Object} options.data - Data to validate
 * @param {Function} options.next - Express next function
 * @param {Object} options.schema - Joi schema
 * @returns {Object|null} - Validated data or null
 */
export const inputValidation = ({ data = {}, next = {}, schema = {} }) => {
  try {
    // Fast path for empty data
    if (!data || typeof data !== "object") {
      return errMiddleware({
        next,
        error: "Invalid input data",
        statusCode: 400,
      });
    }

    // Only cache small objects to avoid memory issues
    const isCacheable =
      Object.keys(data).length <= 10 && JSON.stringify(data).length < 2000;

    let cacheKey;
    if (isCacheable) {
      // Generate a fast cache key using schema ID and data hash
      const schemaId = schema._ids?._byKey?.size || 0;
      const dataKeys = Object.keys(data).sort().join("|");
      const dataValues = Object.values(data)
        .map((v) => (typeof v === "string" ? v.substring(0, 10) : String(v)))
        .join("|");

      // Create a compact hash for the cache key
      cacheKey = `v${schemaId}_${hashString(dataKeys + dataValues)}`;

      // Check cache - fast path
      const cachedResult = validationCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Perform validation with optimized options
    const { error, value } = schema.validate(data, {
      abortEarly: true, // Stop on first error for better performance
      stripUnknown: true, // Remove unknown fields
      cache: true, // Use Joi's internal caching
    });

    // Handle validation error
    if (error) {
      return errMiddleware({
        next,
        error: error.details[0].message,
        statusCode: 400,
      });
    }

    // Cache successful validation result
    if (isCacheable && value) {
      validationCache.set(cacheKey, value);
    }

    return value;
  } catch (err) {
    return errMiddleware({
      next,
      error: "Validation error",
      statusCode: 500,
    });
  }
};

// MongoDB ObjectId validation regex - much faster than mongoose.Types.ObjectId.isValid
const MONGODB_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// Cache for validated IDs
const validIdCache = new Set();

/**
 * Optimized MongoDB ID validation
 * @param {Object} options - Validation options
 * @param {string} options.id - ID to validate
 * @param {Function} options.next - Express next function
 * @returns {string|null} - Validated ID or null
 */
export const isValidMongoId = ({ id, next }) => {
  // Fast path for empty ID
  if (!id) {
    if (next) {
      return errMiddleware({
        next,
        error: "ID is required",
        statusCode: 400,
      });
    }
    return null;
  }

  // Check cache for previously validated IDs
  if (validIdCache.has(id)) {
    return id;
  }

  // Use regex for faster validation instead of mongoose.Types.ObjectId.isValid
  if (!MONGODB_ID_REGEX.test(id)) {
    if (next) {
      return errMiddleware({
        next,
        error: "Invalid ID format",
        statusCode: 400,
      });
    }
    return null;
  }

  // Cache valid ID (limit cache size to prevent memory leaks)
  if (validIdCache.size < 1000) {
    validIdCache.add(id);
  }

  return id;
};

/**
 * Optimized function to remove empty fields from an object
 * @param {Object} obj - Object to process
 * @returns {Object} - Result with valid flag, message, and filtered object
 */
export const removeEmptyFields = (obj) => {
  // Fast path for invalid inputs
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { valid: false, message: "Invalid object" };
  }

  // Use Object.entries for better performance
  const entries = Object.entries(obj);

  // Fast path for empty objects
  if (entries.length === 0) {
    return { valid: false, message: "No fields provided" };
  }

  // Filter out empty values in one pass
  const filteredEntries = entries.filter(
    ([_, value]) => value !== null && value !== undefined && value !== ""
  );

  // Fast path for objects with no valid fields
  if (filteredEntries.length === 0) {
    return { valid: false, message: "No valid fields provided" };
  }

  // Create result object from filtered entries
  const result = Object.fromEntries(filteredEntries);

  return { valid: true, value: result };
};