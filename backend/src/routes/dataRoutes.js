const express = require("express");
const rateLimit = require("express-rate-limit");
const DataController = require("../controllers/dataController");

const router = express.Router();

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    retryAfter: Math.round((15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
      retryAfter: Math.round((15 * 60 * 1000) / 1000),
    });
  },
});

router.use(apiLimiter);

// Request logging middleware
router.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Core CRUD endpoints
router.get("/data", DataController.getAllData);
router.get("/data/:id", DataController.getDataById);
router.delete("/data/:id", DataController.deleteData);

// Filter utility endpoints
router.get("/filters/:column/values", DataController.getFilterValues);
router.get("/filters/price/range", DataController.getPriceRange);

// Utility endpoints
router.get("/schema", DataController.getSchema);
router.get("/health", DataController.healthCheck);

// API documentation endpoint
router.get("/docs", (req, res) => {
  res.json({
    title: "BMW Electric Cars DataGrid API",
    version: "1.0.0",
    endpoints: [
      "GET /api/data - List cars with filtering, search, pagination",
      "GET /api/data/:id - Get car by ID",
      "DELETE /api/data/:id - Delete car by ID",
      "GET /api/filters/:column/values - Get distinct values for dropdown filters",
      "GET /api/filters/price/range - Get price range for slider",
      "GET /api/schema - Get database schema",
      "GET /api/health - Health check",
    ],
    filterColumns: [
      "brand",
      "model",
      "segment",
      "body_style",
      "price_euro",
      "range_km",
      "seats",
    ],
    filterTypes: [
      "contains",
      "equals",
      "startsWith",
      "endsWith",
      "isEmpty",
      "greaterThan",
      "lessThan",
    ],
    example:
      "/api/data?brand_filter_type=equals&brand_filter_value=BMW&search=electric",
  });
});

// 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

module.exports = router;
