const express = require("express");
const cors = require("cors");
const path = require("path");
const { initializeDatabase } = require("./config/database");
const dataRoutes = require("./routes/dataRoutes");
const csvImporter = require("./utils/csvImporter");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure CORS for React frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Serve static files from React build (in production)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "BMW DataGrid Backend",
    version: "1.0.0",
  });
});

// Mount API routes
app.use("/api", dataRoutes);

// Serve React app for any non-API routes (in production)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });
} else {
  // Handle unknown routes in development
  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Endpoint not found",
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// Initialize database and import test data, then start server
async function startServer() {
  try {
    console.log("Starting server...");

    await initializeDatabase();
    console.log("Database ready");

    // Import BMW test data if not already present
    const dataImported = await csvImporter.importElectricCarsData();
    if (dataImported) {
      console.log("CSV data imported");
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      if (process.env.NODE_ENV === "production") {
        console.log(`Frontend: http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
