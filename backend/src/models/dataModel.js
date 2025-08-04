const { pool } = require("../config/database");

class DataModel {
  static async getAll(
    filters = {},
    search = "",
    page = 1,
    limit = 20,
    sortBy = "id",
    sortOrder = "desc"
  ) {
    let connection;
    try {
      connection = await pool.getConnection();

      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 20, 50);
      const offset = (pageNum - 1) * limitNum;

      let query = "SELECT * FROM electric_cars";
      let params = [];
      let conditions = [];

      // Multi-column search functionality
      if (search?.trim()) {
        conditions.push(
          "(brand LIKE ? OR model LIKE ? OR power_train LIKE ? OR segment LIKE ? OR body_style LIKE ?)"
        );
        const searchTerm = `%${search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Handle price range filters
      const minPriceValue =
        filters.price_euro_min_filter_value ||
        filters.price_min?.value ||
        filters.price_euro_filter_value;
      const maxPriceValue =
        filters.price_euro_max_filter_value || filters.price_max?.value;

      if (minPriceValue && !isNaN(minPriceValue)) {
        conditions.push("price_euro >= ?");
        params.push(parseFloat(minPriceValue));
      }

      if (maxPriceValue && !isNaN(maxPriceValue)) {
        conditions.push("price_euro <= ?");
        params.push(parseFloat(maxPriceValue));
      }

      // Apply column filters
      Object.entries(filters).forEach(([column, filter]) => {
        // Skip price filters as they're handled above
        if (
          column.includes("price_euro") ||
          column === "price_min" ||
          column === "price_max"
        ) {
          return;
        }

        if (filter?.value !== undefined && filter.value !== "") {
          const sanitizedColumn = this.sanitizeColumn(column);
          const filterCondition = this.buildFilterCondition(
            sanitizedColumn,
            filter
          );

          if (filterCondition) {
            conditions.push(filterCondition.condition);
            if (filterCondition.params) {
              params.push(...filterCondition.params);
            }
          }
        }
      });

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      // Get total count for pagination
      const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total;

      // Apply sorting and pagination
      const orderDirection = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";
      const sanitizedSortBy = this.sanitizeColumn(sortBy);
      query += ` ORDER BY ${sanitizedSortBy} ${orderDirection} LIMIT ${limitNum} OFFSET ${offset}`;

      const [rows] = await connection.execute(query, params);

      return {
        data: rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  static async getById(id) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT * FROM electric_cars WHERE id = ?",
        [parseInt(id)]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch record: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  static async delete(id) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(
        "DELETE FROM electric_cars WHERE id = ?",
        [parseInt(id)]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to delete record: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  static async getDistinctValues(column) {
    let connection;
    try {
      connection = await pool.getConnection();
      const sanitizedColumn = this.sanitizeColumn(column);

      const [rows] = await connection.execute(
        `SELECT DISTINCT ${sanitizedColumn} as value FROM electric_cars 
         WHERE ${sanitizedColumn} IS NOT NULL AND ${sanitizedColumn} != '' 
         ORDER BY ${sanitizedColumn} LIMIT 100`
      );

      return rows.map((row) => row.value);
    } catch (error) {
      throw new Error(`Failed to fetch distinct values: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  static async getPriceRange() {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT MIN(price_euro) as min_price, MAX(price_euro) as max_price FROM electric_cars WHERE price_euro IS NOT NULL"
      );

      return {
        min: Math.floor((rows[0].min_price || 0) / 1000) * 1000,
        max: Math.ceil((rows[0].max_price || 100000) / 1000) * 1000,
      };
    } catch (error) {
      throw new Error(`Failed to fetch price range: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  static async getSchema() {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute("DESCRIBE electric_cars");

      return rows
        .filter(
          (row) => !["id", "created_at", "updated_at"].includes(row.Field)
        )
        .map((row) => ({
          field: row.Field,
          type:
            row.Type.includes("int") || row.Type.includes("decimal")
              ? "number"
              : "text",
          displayName: this.formatDisplayName(row.Field),
        }));
    } catch (error) {
      throw new Error(`Failed to fetch schema: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  static async getHealthStatus() {
    let connection;
    try {
      connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT COUNT(*) as count FROM electric_cars"
      );
      return {
        database: rows[0].count > 0 ? "has data" : "empty",
        count: rows[0].count,
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    } finally {
      if (connection) connection.release();
    }
  }

  // Build SQL filter conditions based on filter type
  static buildFilterCondition(column, filter) {
    const { type, value } = filter;

    switch (type) {
      case "contains":
        return { condition: `${column} LIKE ?`, params: [`%${value}%`] };
      case "equals":
        return { condition: `${column} = ?`, params: [value] };
      case "startsWith":
        return { condition: `${column} LIKE ?`, params: [`${value}%`] };
      case "endsWith":
        return { condition: `${column} LIKE ?`, params: [`%${value}`] };
      case "isEmpty":
        return {
          condition: `(${column} IS NULL OR ${column} = '')`,
          params: [],
        };
      case "greaterThan":
        return !isNaN(value)
          ? { condition: `${column} >= ?`, params: [parseFloat(value)] }
          : null;
      case "lessThan":
        return !isNaN(value)
          ? { condition: `${column} <= ?`, params: [parseFloat(value)] }
          : null;
      default:
        return null;
    }
  }

  // Sanitize column names to prevent SQL injection
  static sanitizeColumn(column) {
    const validColumns = [
      "id",
      "brand",
      "model",
      "accel_sec",
      "top_speed_kmh",
      "range_km",
      "efficiency_whkm",
      "fast_charge_kmh",
      "rapid_charge",
      "power_train",
      "plug_type",
      "body_style",
      "segment",
      "seats",
      "price_euro",
      "date",
      "created_at",
      "updated_at",
    ];
    return validColumns.includes(column) ? column : "id";
  }

  // Format field names for display
  static formatDisplayName(fieldName) {
    const fieldMappings = {
      brand: "Brand",
      model: "Model",
      accel_sec: "Acceleration (0-100)",
      top_speed_kmh: "Top Speed (km/h)",
      range_km: "Range (km)",
      efficiency_whkm: "Efficiency (Wh/km)",
      fast_charge_kmh: "Fast Charge Rate",
      rapid_charge: "Rapid Charge",
      power_train: "Powertrain",
      plug_type: "Plug Type",
      body_style: "Body Style",
      segment: "Segment",
      seats: "Seats",
      price_euro: "Price (€)",
      date: "Date",
    };

    return (
      fieldMappings[fieldName] ||
      fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }
}

module.exports = DataModel;
