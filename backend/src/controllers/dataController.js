const DataModel = require("../models/dataModel");
const PerformanceMonitor = require("../utils/performance");
const validation = require("../middleware/validation");

class DataController {
  // Get electric cars with search, filtering, sorting, and pagination
  static async getAllData(req, res) {
    const startTime = Date.now();

    try {
      const { error, value } = validation.query.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const { search, page, limit, sortBy, sortOrder } = value;
      const filters = DataController.extractFilters(req.query);

      // Validate dynamic filters
      const filterErrors = validation.validateFilters(req.query);
      if (filterErrors.length > 0) {
        console.warn("Filter validation errors:", filterErrors);
      }

      const result = await DataModel.getAll(
        filters,
        search,
        page,
        limit,
        sortBy,
        sortOrder
      );

      // Track performance metrics
      PerformanceMonitor.logPerformance("getAllData", startTime, {
        records: result.data.length,
        totalRecords: result.pagination.total,
        page: result.pagination.page,
        hasFilters: Object.keys(filters).length > 0,
        hasSearch: !!search,
        filterCount: Object.keys(filters).length,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("getAllData_ERROR", startTime, {
        error: error.message,
        ip: req.ip,
      });

      console.error("Error in getAllData:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve data",
      });
    }
  }

  // Get single electric car by ID
  static async getDataById(req, res) {
    const startTime = Date.now();

    try {
      const { error, value } = validation.id.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      const car = await DataModel.getById(value.id);

      PerformanceMonitor.logPerformance("getDataById", startTime, {
        id: value.id,
        found: !!car,
        ip: req.ip,
      });

      if (!car) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      res.json({
        success: true,
        data: car,
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("getDataById_ERROR", startTime, {
        error: error.message,
        id: req.params.id,
        ip: req.ip,
      });

      console.error("Error in getDataById:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve car details",
      });
    }
  }

  // Delete electric car record
  static async deleteData(req, res) {
    const startTime = Date.now();

    try {
      const { error, value } = validation.id.validate(req.params);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format",
        });
      }

      const deleted = await DataModel.delete(value.id);

      PerformanceMonitor.logPerformance("deleteData", startTime, {
        id: value.id,
        deleted: deleted,
        ip: req.ip,
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Car not found",
        });
      }

      res.json({
        success: true,
        message: "Car deleted successfully",
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("deleteData_ERROR", startTime, {
        error: error.message,
        id: req.params.id,
        ip: req.ip,
      });

      console.error("Error in deleteData:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to delete car",
      });
    }
  }

  // Get distinct values for filter dropdowns
  static async getFilterValues(req, res) {
    const startTime = Date.now();

    try {
      const { column } = req.params;

      if (!validation.BASE_COLUMNS.includes(column)) {
        return res.status(400).json({
          success: false,
          message: "Invalid column for filtering",
        });
      }

      const values = await DataModel.getDistinctValues(column);

      PerformanceMonitor.logPerformance("getFilterValues", startTime, {
        column: column,
        valueCount: values.length,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: values,
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("getFilterValues_ERROR", startTime, {
        error: error.message,
        column: req.params.column,
        ip: req.ip,
      });

      console.error("Error in getFilterValues:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve filter values",
      });
    }
  }

  // Get price range for slider component
  static async getPriceRange(req, res) {
    const startTime = Date.now();

    try {
      const priceRange = await DataModel.getPriceRange();

      PerformanceMonitor.logPerformance("getPriceRange", startTime, {
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: priceRange,
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("getPriceRange_ERROR", startTime, {
        error: error.message,
        ip: req.ip,
      });

      console.error("Error in getPriceRange:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve price range",
      });
    }
  }

  // Get database schema for dynamic column configuration
  static async getSchema(req, res) {
    const startTime = Date.now();

    try {
      const schema = await DataModel.getSchema();

      PerformanceMonitor.logPerformance("getSchema", startTime, {
        fieldCount: schema.length,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: schema,
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("getSchema_ERROR", startTime, {
        error: error.message,
        ip: req.ip,
      });

      console.error("Error in getSchema:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve schema",
      });
    }
  }

  // Health check endpoint
  static async healthCheck(req, res) {
    const startTime = Date.now();

    try {
      const health = await DataModel.getHealthStatus();

      PerformanceMonitor.logPerformance("healthCheck", startTime, {
        status: "healthy",
        recordCount: health.count,
        ip: req.ip,
      });

      res.json({
        success: true,
        status: "healthy",
        ...health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      PerformanceMonitor.logPerformance("healthCheck_ERROR", startTime, {
        error: error.message,
        status: "unhealthy",
        ip: req.ip,
      });

      console.error("Health check failed:", error.message);
      res.status(503).json({
        success: false,
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Extract filters from query parameters
  static extractFilters(query) {
    const filters = {};

    // Handle standard column_filter_type/column_filter_value pairs
    Object.keys(query).forEach((key) => {
      if (key.endsWith("_filter_type")) {
        const column = key.replace("_filter_type", "");
        const valueKey = `${column}_filter_value`;

        if (query[valueKey] !== undefined || query[key] === "isEmpty") {
          filters[column] = {
            type: query[key],
            value: query[valueKey],
          };
        }
      }
    });

    // Handle price range filters from slider component
    if (query.price_euro_min_filter_type && query.price_euro_min_filter_value) {
      filters.price_euro_min_filter_type = query.price_euro_min_filter_type;
      filters.price_euro_min_filter_value = query.price_euro_min_filter_value;
    }

    if (query.price_euro_max_filter_type && query.price_euro_max_filter_value) {
      filters.price_euro_max_filter_type = query.price_euro_max_filter_type;
      filters.price_euro_max_filter_value = query.price_euro_max_filter_value;
    }

    return filters;
  }
}

module.exports = DataController;
