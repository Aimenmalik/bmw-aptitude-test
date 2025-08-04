const mysql = require("mysql2/promise");
require("dotenv").config();

// Updated to handle Railway's MySQL environment variables
const dbConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || "localhost",
  port: process.env.MYSQL_PORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQL_USER || process.env.DB_USER || "bmw_user",
  password:
    process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || "Bmw_root_2025",
  database:
    process.env.MYSQL_DATABASE || process.env.DB_NAME || "bmw_electric_cars",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
};

// Using connection pooling for better performance under load
const pool = mysql.createPool(dbConfig);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error.message);
    return false;
  }
}

async function initializeDatabase() {
  let connection;
  try {
    // For Railway, skip database creation (it's already provided)
    if (process.env.MYSQL_HOST) {
      console.log(
        "Railway environment detected - connecting to existing database"
      );
      connection = await pool.getConnection();
    } else {
      // Local development - create database if needed
      const tempConfig = { ...dbConfig };
      delete tempConfig.database;
      const tempPool = mysql.createPool(tempConfig);
      connection = await tempPool.getConnection();

      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`Database '${dbConfig.database}' ready`);

      connection.release();
      await tempPool.end();

      connection = await pool.getConnection();
    }

    // Table schema with indexes for common query patterns
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS electric_cars (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(150) NOT NULL,
        accel_sec DECIMAL(4,2),
        top_speed_kmh INT,
        range_km INT,
        efficiency_whkm INT,
        fast_charge_kmh VARCHAR(50),
        rapid_charge VARCHAR(50),
        power_train VARCHAR(100),
        plug_type VARCHAR(50),
        body_style VARCHAR(50),
        segment VARCHAR(50),
        seats INT,
        price_euro INT,
        date VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_brand (brand),
        INDEX idx_model (model),
        INDEX idx_segment (segment),
        INDEX idx_price (price_euro),
        INDEX idx_range (range_km),
        INDEX idx_brand_model (brand, model),
        FULLTEXT idx_search (brand, model, power_train)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createTableQuery);
    console.log("Electric cars table created/verified");

    connection.release();
    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    if (connection) {
      connection.release();
    }
    throw error;
  }
}

async function closeDatabase() {
  try {
    await pool.end();
    console.log("Database connections closed gracefully");
  } catch (error) {
    console.error("Error closing database connections:", error);
  }
}

// Clean shutdown when app terminates
process.on("SIGINT", closeDatabase);
process.on("SIGTERM", closeDatabase);

module.exports = {
  pool,
  initializeDatabase,
  testConnection,
  closeDatabase,
};
