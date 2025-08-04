const Joi = require("joi");

// Supported filter operations
const FILTER_TYPES = [
  "contains",
  "equals",
  "startsWith",
  "endsWith",
  "isEmpty",
  "greaterThan",
  "lessThan",
];

// Base database columns for filtering and sorting
const BASE_COLUMNS = [
  "id",
  "brand",
  "model",
  "accel_sec",
  "top_speed_kmh",
  "range_km",
  "efficiency_whkm",
  "price_euro",
  "seats",
  "segment",
  "body_style",
  "power_train",
  "plug_type",
  "created_at",
];

// Generate valid columns including dynamic filter variations
const generateValidColumns = () => {
  const validColumns = [...BASE_COLUMNS];
  BASE_COLUMNS.forEach((column) => {
    validColumns.push(`${column}_min`);
    validColumns.push(`${column}_max`);
  });
  return validColumns;
};

const VALID_COLUMNS = generateValidColumns();

const schemas = {
  query: Joi.object({
    search: Joi.string().max(100).default(""),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortBy: Joi.string()
      .valid(...BASE_COLUMNS)
      .default("id"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  }).unknown(true),

  id: Joi.object({
    id: Joi.number().integer().min(1).required(),
  }),

  filterValue: Joi.alternatives().try(
    Joi.string().max(255),
    Joi.number(),
    Joi.boolean()
  ),
};

// Validate dynamic filter parameters
function validateFilters(query) {
  const errors = [];

  Object.keys(query).forEach((key) => {
    if (key.endsWith("_filter_type")) {
      const filterType = query[key];
      const column = key.replace("_filter_type", "");

      if (!FILTER_TYPES.includes(filterType)) {
        errors.push(
          `Invalid filter type '${filterType}' for column '${column}'`
        );
      }

      const isValidColumn = BASE_COLUMNS.some(
        (baseCol) =>
          column === baseCol ||
          column.startsWith(baseCol + "_min") ||
          column.startsWith(baseCol + "_max")
      );

      if (!isValidColumn) {
        errors.push(`Column '${column}' is not filterable`);
      }

      const valueKey = `${column}_filter_value`;
      if (filterType !== "isEmpty" && query[valueKey] === undefined) {
        errors.push(`Missing filter value for column '${column}'`);
      }
    }
  });

  return errors;
}

module.exports = {
  schemas,
  FILTER_TYPES,
  VALID_COLUMNS,
  BASE_COLUMNS,
  validateFilters,
  ...schemas,
};
