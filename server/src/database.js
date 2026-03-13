const { Sequelize } = require("sequelize");
const path = require("path");

// Load environment variables - load server/.env first, then root .env to override
// This ensures root .env (new credentials) takes precedence
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load server/.env first
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true }); // Root .env overrides

// Create Sequelize instance first
const dbName = process.env.DB_NAME || "rto_db";
const dbUser = process.env.DB_USER || "rto";
const dbPassword = process.env.DB_PASSWORD || "";
const dbHost = process.env.DB_HOST || "31.97.61.5";
const dbPort = process.env.DB_PORT || 3306;

// Log which credentials are being used (without password)
console.log("🔐 Database Configuration:");
console.log(`   Host: ${dbHost}`);
console.log(`   Port: ${dbPort}`);
console.log(`   Database: ${dbName}`);
console.log(`   User: ${dbUser}`);

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: dbPort,
    dialect: "mysql",
    pool: {
      max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
      min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
      idle: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
      acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
      evict: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
    },
    dialectOptions: {
      connectTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
      max: 3,
    },
    logging: process.env.NODE_ENV === "development" ? console.log : false,
  }
);

// Track connection status
let isConnected = false;

const connectDB = async () => {
  try {
    // Check if already connected
    if (isConnected) {
      console.log('✅ Database already connected, reusing connection');
      return sequelize;
    }

    // Import models after sequelize is created
    require('../models/User');
    require('../models/RTOData');
    require('../models/ScanResult');
    require('../models/Complaint');

    await sequelize.authenticate();
    isConnected = true;
    console.log("✅ MySQL database connected successfully");
    console.log(`📊 Connection pool configured: min=${sequelize.config.pool.min}, max=${sequelize.config.pool.max}`);

    // Fix invalid dates before syncing (try both methods)
    try {
      const fixInvalidDates = require("../migrations/fix-invalid-dates");
      await fixInvalidDates();
    } catch (migrationError) {
      console.warn("Warning: Could not run date fix migration:", migrationError.message);
      // Try force fix as fallback
      try {
        const forceFixDates = require("../migrations/force-fix-dates");
        await forceFixDates();
      } catch (forceError) {
        console.warn("Warning: Force fix also failed:", forceError.message);
      }
    }

    // Sync database (create tables if they don't exist)
    try {
      await sequelize.sync({ alter: true });
      console.log("✅ Database synchronized");
    } catch (syncError) {
      // If sync fails due to invalid dates, try to fix and retry
      if (syncError.message && syncError.message.includes("Incorrect date value")) {
        console.warn("⚠️  Sync failed due to invalid dates, attempting to fix...");
        try {
          // First, try to update invalid dates directly using SQL
          const today = new Date().toISOString().split('T')[0];
          await sequelize.query(`
            UPDATE rto_data 
            SET date = '${today}' 
            WHERE YEAR(date) = 0 OR date IS NULL OR CAST(date AS CHAR) LIKE '0000%'
          `).catch(() => {
            // If update fails, try delete
            return sequelize.query(`
              DELETE FROM rto_data 
              WHERE YEAR(date) = 0 OR date IS NULL
            `);
          });
          
          // Also fix scan_results
          await sequelize.query(`
            UPDATE scan_results 
            SET date = '${today}' 
            WHERE YEAR(date) = 0 OR date IS NULL OR CAST(date AS CHAR) LIKE '0000%'
          `).catch(() => {
            return sequelize.query(`
              DELETE FROM scan_results 
              WHERE YEAR(date) = 0 OR date IS NULL
            `);
          });
          
          // Retry sync after cleanup
          await sequelize.sync({ alter: true });
          console.log("✅ Database synchronized after cleanup");
        } catch (retryError) {
          console.error("❌ Failed to sync even after cleanup:", retryError.message);
          // Last resort: try sync without alter
          console.warn("⚠️  Attempting sync without alter...");
          await sequelize.sync({ alter: false });
          console.log("✅ Database synchronized (without alter)");
        }
      } else {
        throw syncError;
      }
    }

    return sequelize;
  } catch (error) {
    isConnected = false;
    console.error("❌ Database connection error:", error.message);
    console.error("Full error:", error);
    // Don't exit process - let the server start and retry
    // PM2 will handle restarts if needed
    throw error;
  }
};

// Gracefully close database connection
const closeDB = async () => {
  try {
    if (isConnected) {
      console.log('🔄 Closing database connection...');
      await sequelize.close();
      isConnected = false;
      console.log('✅ Database connection closed gracefully');
    } else {
      console.log('ℹ️  Database connection already closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error.message);
    throw error;
  }
};

// Handle process termination signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await closeDB();
  process.exit(0);
});

module.exports = { connectDB, closeDB, sequelize };
