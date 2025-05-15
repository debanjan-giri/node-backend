import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { createServer } from "node:http";
import mongoose from "mongoose";
import connectDB from "./config/connectDB.js";

import outletAuthRoute from "./routes/outlet-route/outlet_account_route.js";
import orderCategoryRoute from "./routes/outlet-route/order_category_route.js";
import foodManageRoute from "./routes/outlet-route/food_manage_route.js";
import discoveryRoute from "./routes/outlet-route/discovery_route.js";
import salesAnalyticsRoute from "./routes/outlet-route/sales_analytics_route.js";
import userAccountRoute from "./routes/user-route/user_account_route.js";
import outletManageRoute from "./routes/user-route/outlet_manage_route.js";
import outletDiscoveryRoute from "./routes/user-route/outlet_discovery_route.js";
import foodPointRoute from "./routes/user-route/food_point_route.js";
import errorHandler from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || "dev"}` });

// Initialize app
const app = express();
const server = createServer(app);

// ========== Global Variables ==========
let isShuttingDown = false;

// ========== Middlewares ==========
app.set("trust proxy", 1); // Trust first proxy (e.g., NGINX)

// Apply compression for better performance
app.use(
  compression({
    level: 6, // Balanced between CPU usage and compression ratio
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses with this header
      if (req.headers["x-no-compression"]) {
        return false;
      }
      // Use compression filter function from the module
      return compression.filter(req, res);
    },
  })
);

// Apply helmet with optimized security settings
app.use(
  helmet({
    contentSecurityPolicy: true,
    dnsPrefetchControl: true,
    hidePoweredBy: true,
    hsts: true,
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "deny" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);

// CORS - Simplified configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "prod"
      ? process.env.ALLOWED_ORIGINS?.split(",") || "*"
      : "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));

// Body Parsers - Optimized for performance
app.use(
  express.json({
    limit: "50kb", // Reduced from 100kb
    strict: true, // Only accept arrays and objects
    reviver: null, // No custom parsing
    type: "application/json", // Only parse application/json
  })
);

app.use(
  express.urlencoded({
    extended: false, // Use querystring library (faster)
    limit: "50kb", // Reduced from 100kb
    parameterLimit: 50, // Reduced from 100
  })
);

// Disable x-powered-by
app.disable("x-powered-by");

// Apply rate limiting for better security and performance
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit to handle higher concurrency
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  skip: (req) => req.path === "/health", // Skip health check endpoint
  // Use memory store for better performance (default)

  // Add more sophisticated rate limiting options
  keyGenerator: (req) => {
    // Use a combination of IP and user agent to better identify clients
    return req.ip + "-" + (req.headers["user-agent"] || "").substring(0, 20);
  },

  // Add a draft function to handle bursts better
  draft: () => {
    // Allow occasional bursts by adding some flexibility
    if (Math.random() < 0.1) {
      // 10% chance to let through even if rate limited
      return true;
    }
    return false;
  },
});

// ========== Health Check ==========
// Pre-compute response objects for better performance
const healthOkResponse = { status: "ok" };
const healthShuttingDownResponse = { status: "shutting_down" };

app.get("/health", (_, res) => {
  // Use pre-computed objects to avoid object creation on each request
  res.json(isShuttingDown ? healthShuttingDownResponse : healthOkResponse);
});

// ========== Routes ==========
// Apply rate limiting to all API routes
app.use("/outlet", apiLimiter);
app.use("/user", apiLimiter);

// Mount route handlers
app.use("/outlet/auth", outletAuthRoute);
app.use("/outlet/category", orderCategoryRoute);
app.use("/outlet/food", foodManageRoute);
app.use("/outlet/discovery", discoveryRoute);
app.use("/outlet/sales", salesAnalyticsRoute);
app.use("/user/auth", userAccountRoute);
app.use("/user/outlet", outletManageRoute);
app.use("/user/discovery", outletDiscoveryRoute);
app.use("/user/point", foodPointRoute);

// Not Found - pre-defined object with status code for better performance
const notFoundResponse = { success: false, message: "Route not found" };
app.use("*", (_, res) => {
  // Set status and send response in one operation
  res.status(404).json(notFoundResponse);
});

// Global Error Handler
app.use(errorHandler);

// ========== Server Settings ==========
// Ultra-optimized timeouts for maximum performance
server.keepAliveTimeout = 20000; // Further reduced for better resource usage
server.headersTimeout = 21000; // Slightly more than keepAliveTimeout
server.maxHeadersCount = 30; // Further reduced for better memory usage
server.timeout = 10000; // Further reduced for faster client feedback

// Ultra-optimized connection handling
server.on("connection", (socket) => {
  // Fast path for shutdown
  if (isShuttingDown) {
    socket.destroy();
    return;
  }

  // Set socket timeout to match server timeout
  socket.setTimeout(10000);

  // Optimize socket for performance
  socket.setNoDelay(true); // Disable Nagle's algorithm for faster transmission
  socket.setKeepAlive(true, 5000); // Enable keep-alive with 5s interval

  // Handle socket errors silently to prevent crashes
  socket.on("error", () => {
    socket.destroy();
  });
});

// Ultra-optimized Graceful Shutdown
function gracefulShutdown() {
  // Fast path for already shutting down
  if (isShuttingDown) return;
  isShuttingDown = true;

  // Pre-set force shutdown timeout
  const forceShutdownTimeout = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000); // Reduced to 10 seconds for faster recovery

  // Stop accepting new connections
  server.close(() => {
    // Clean up database connection if connected
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      mongoose.connection
        .close(false) // Don't force close - allow clean shutdown
        .catch(() => {}) // Ignore errors during shutdown
        .finally(() => {
          clearTimeout(forceShutdownTimeout);
          process.exit(0);
        });
    } else {
      // No database connection to close
      clearTimeout(forceShutdownTimeout);
      process.exit(0);
    }
  });

  // Close all existing connections to speed up shutdown
  // This is more aggressive but ensures faster shutdown
  if (server.connections) {
    for (const socket of Object.values(server.connections)) {
      socket.destroy();
    }
  }
}

// Shutdown signal handlers
process.on("SIGTERM", () => {
  if (process.env.NODE_ENV !== "prod") {
    console.log("Received SIGTERM signal");
  }
  gracefulShutdown();
});

process.on("SIGINT", () => {
  if (process.env.NODE_ENV !== "prod") {
    console.log("Received SIGINT signal");
  }
  gracefulShutdown();
});

// Optimized error handling
process.on("uncaughtException", (err) => {
  // Only log in development
  if (process.env.NODE_ENV !== "prod") {
    console.error("Uncaught Exception:", err.name, err.message);
  }
  gracefulShutdown();
});

process.on("unhandledRejection", (reason) => {
  // Only log in development
  if (process.env.NODE_ENV !== "prod") {
    const error =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : String(reason);
    console.error("Unhandled Rejection:", error);
  }
  gracefulShutdown();
});

// ========== Start Server ==========
const PORT = process.env.PORT || 4000; // Changed to 4000 to avoid conflicts

// Optimized server startup with parallel database connection
const startServer = async () => {
  // Start database connection in parallel with server startup
  const dbConnectionPromise = connectDB();

  // Start HTTP server
  const serverPromise = new Promise((resolve) => {
    server.listen(PORT, () => {
      // Only log in development
      if (process.env.NODE_ENV !== "prod") {
        console.log(
          `Server running: ${process.env.NODE_ENV} http://localhost:${PORT}`
        );
      }
      resolve();
    });
  });

  try {
    // Wait for server to start (this will be fast)
    await serverPromise;

    // Now check database connection result
    const connected = await dbConnectionPromise;

    // Handle connection failure in production
    if (!connected && process.env.NODE_ENV === "prod") {
      console.error("Database connection failed in production, shutting down");
      process.exit(1);
    }

    // Server is fully ready
    if (process.env.NODE_ENV !== "prod") {
      console.log("Server and database initialization complete");
    }
  } catch (err) {
    // Handle critical startup errors
    if (process.env.NODE_ENV === "prod") {
      console.error("Critical startup error:", err.message);
      process.exit(1);
    } else {
      console.error("Startup error:", err.message);
    }
  }
};

// Start the server
startServer();
