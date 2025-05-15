import { verifyToken } from "../utils/reqResFunction.js";

// Pre-computed response objects for better performance
const authHeaderMissingResponse = Object.freeze({
  success: false,
  message: "Authorization header missing",
});

const tokenMissingResponse = Object.freeze({
  success: false,
  message: "Token missing",
});

const invalidTokenResponse = Object.freeze({
  success: false,
  message: "Invalid token",
});

/**
 * Ultra-optimized middleware to verify access tokens
 * - Fast paths for common cases
 * - Minimal processing for better performance
 * - No database lookups
 */
export const verifyAccessToken = (req, res, next) => {
  // Fast path - check if authorization header exists
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json(authHeaderMissingResponse);
  }

  // Fast path - extract token with minimal string operations
  // Use substring instead of startsWith+substring for better performance
  const token =
    authHeader.substring(0, 7) === "Bearer "
      ? authHeader.substring(7)
      : authHeader;

  // Fast path - check if token exists
  if (!token || token.length < 10) {
    // JWT tokens are always longer than 10 chars
    return res.status(401).json(tokenMissingResponse);
  }

  // Verify token using the optimized utility function
  verifyToken(token)
    .then((userId) => {
      // Fast path - invalid token
      if (!userId) {
        return res.status(401).json(invalidTokenResponse);
      }

      // Set minimal user data (just ID) - no extra properties
      req.userData = { _id: userId };

      // Continue to next middleware
      next();
    })
    .catch(() => {
      // All errors result in invalid token response for security
      // This is faster than checking error types
      return res.status(401).json(invalidTokenResponse);
    });
};
