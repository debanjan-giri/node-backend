import mongoose from "mongoose";

// Set up mongoose configuration only once with ultra-optimized settings
mongoose.set("strictQuery", true); // Better query performance
mongoose.set("toJSON", {
  virtuals: false, // Don't include virtuals in JSON
  versionKey: false, // Don't include __v in JSON
  transform: (_, ret) => {
    // Faster ID transformation with direct property assignment
    if (ret._id) ret.id = ret._id.toString();
    return ret;
  },
});

// Disable Mongoose debug mode in production
if (process.env.NODE_ENV === "prod") {
  mongoose.set("debug", false);
} else {
  // Enable selective debug in development for query optimization
  mongoose.set("debug", {
    color: false, // Disable colors for better performance
    shell: false, // Disable shell formatting
    // Only log slow queries in development
    filter: (query) => {
      // Store query start time
      query._startTime = Date.now();
      // Add callback to check execution time
      const origCallback = query.callback;
      query.callback = function (err, res) {
        const executionTime = Date.now() - query._startTime;
        // Only log queries that take more than 100ms
        if (executionTime > 100) {
          console.log(
            `Slow query (${executionTime}ms):`,
            this.op,
            this.model.modelName
          );
        }
        origCallback.call(this, err, res);
      };
      // Don't log the query in the normal debug output
      return false;
    },
  });
}

// Set up enhanced event listeners for better connection management
const db = mongoose.connection;

// Only set up listeners if they don't already exist
const setupListeners = () => {
  // Connection events
  if (db.listenerCount("connected") === 0) {
    db.on("connected", () => {
      if (process.env.NODE_ENV !== "prod") {
        console.log("MongoDB connected successfully");
      }
    });
  }

  // Disconnection events with auto-reconnect logic
  if (db.listenerCount("disconnected") === 0) {
    db.on("disconnected", () => {
      if (process.env.NODE_ENV !== "prod") {
        console.log("MongoDB disconnected, will auto-reconnect");
      }
    });
  }

  // Error events with better handling
  if (db.listenerCount("error") === 0) {
    db.on("error", (err) => {
      if (process.env.NODE_ENV !== "prod") {
        console.error("MongoDB connection error:", err.message);
      }
    });
  }

  // Reconnect events
  if (db.listenerCount("reconnected") === 0) {
    db.on("reconnected", () => {
      if (process.env.NODE_ENV !== "prod") {
        console.log("MongoDB reconnected successfully");
      }
    });
  }

  // Monitor for slow operations in development
  if (process.env.NODE_ENV !== "prod" && db.listenerCount("slowOp") === 0) {
    db.on("slowOp", (data) => {
      console.warn("Slow MongoDB operation detected:", {
        op: data.op,
        ns: data.ns,
        duration: data.duration,
      });
    });
  }
};

// Set up the listeners
setupListeners();

/**
 * Connect to MongoDB with optimized settings
 * @param {number} retries - Number of connection attempts
 * @param {number} interval - Delay between retries in ms
 * @returns {Promise<boolean|null>} Connection status
 */
const connectDB = async (retries = 3, interval = 2000) => {
  if (!process.env.MONGODB_URI) {
    if (process.env.NODE_ENV !== "prod") {
      console.error("MONGODB_URI not defined in environment variables.");
    }
    return null;
  }

  // Ultra-optimized connection options for maximum performance and connection pooling
  const options = {
    // Connection Pool Settings
    maxPoolSize: 150, // Further increased for higher concurrency
    minPoolSize: 10, // Increased minimum connections for faster response
    maxConnecting: 10, // Allow more parallel connection attempts
    socketTimeoutMS: 30000, // Increased for long-running queries
    connectTimeoutMS: 5000, // Slightly increased for more reliable connections
    serverSelectionTimeoutMS: 5000, // Slightly increased for more reliable server selection

    // Performance Settings
    heartbeatFrequencyMS: 10000, // Reduced from default 30000
    localThresholdMS: 15, // Lower threshold for selecting among multiple servers
    retryWrites: true, // Enable retry for write operations
    retryReads: true, // Enable retry for read operations

    // Read/Write Concerns
    readConcern: { level: "local" }, // Fastest read concern
    readPreference: "primaryPreferred", // Read from primary when available
    w: "majority", // Write to majority for better data consistency
    wtimeoutMS: 2500, // Timeout for write concern

    // Compression and Network
    bufferCommands: false, // Don't buffer commands when disconnected
    compressors: "zlib", // Enable network compression
    zlibCompressionLevel: 6, // Balanced compression level

    // Resource Management
    maxIdleTimeMS: 30000, // Increased to reduce connection churn
    autoIndex: process.env.NODE_ENV !== "prod", // Only create indexes in dev

    // Connection Lifecycle
    family: 4, // Force IPv4 (often faster and more reliable)
  };

  // Optimized non-blocking connection with exponential backoff
  let lastError = null;
  let delayMs = interval;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Create connection promise with timeout
      const connectionPromise = mongoose.connect(
        process.env.MONGODB_URI,
        options
      );
      const timeoutPromise = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          clearTimeout(timeoutId);
          reject(new Error("Connection timeout"));
        }, options.connectTimeoutMS);
      });

      // Race the promises for faster failure detection
      await Promise.race([connectionPromise, timeoutPromise]);

      // Only log in development
      if (process.env.NODE_ENV !== "prod") {
        console.log(`Database connected successfully on attempt ${attempt}`);
      }

      // Connection is established, ensure listeners are set up
      setupListeners();

      // Set up connection pool monitoring in development
      if (process.env.NODE_ENV !== "prod") {
        // Monitor connection pool stats periodically
        const monitorConnectionPool = () => {
          try {
            const client = mongoose.connection.client;
            if (client && client.topology) {
              console.log("MongoDB connection status:", {
                connected: mongoose.connection.readyState === 1,
                poolSize: options.maxPoolSize,
                minPoolSize: options.minPoolSize,
              });
            }
          } catch (err) {
            // Ignore errors in monitoring
          }
        };

        // Log connection status every 30 seconds in development
        const poolMonitorInterval = setInterval(monitorConnectionPool, 30000);

        // Clean up interval on disconnection
        mongoose.connection.once("disconnected", () => {
          clearInterval(poolMonitorInterval);
        });
      }

      return true;
    } catch (error) {
      lastError = error;

      // Exit early on final attempt
      if (attempt === retries) {
        if (process.env.NODE_ENV !== "prod") {
          console.log(`All ${retries} connection attempts failed`);
        }
        break;
      }

      // Only log in development
      if (process.env.NODE_ENV !== "prod") {
        console.error(`Connection attempt ${attempt} failed:`, error.message);
      }

      // Use exponential backoff with jitter for better retry behavior
      delayMs = Math.min(delayMs * 1.5, 10000); // Cap at 10 seconds
      const jitter = Math.floor(Math.random() * 500); // Add randomness

      // Non-blocking delay that doesn't block the event loop
      await new Promise((resolve) => {
        setImmediate(() => setTimeout(resolve, delayMs + jitter));
      });
    }
  }

  // Throw error with original message for better debugging
  if (lastError) {
    throw new Error(`MongoDB connection failed: ${lastError.message}`);
  }

  return false;
};

export default connectDB;
