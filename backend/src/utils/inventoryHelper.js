const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DEFAULT_CAPACITY = 50;

/**
 * Unified stock-level classification used across Admin and Donor portals.
 * - EMPTY: units <= 0
 * - LOW: utilization < 0.4
 * - MEDIUM: utilization < 0.75
 * - HIGH: utilization >= 0.75
 */
function classifyStockLevel(units, capacity = DEFAULT_CAPACITY) {
  const safeUnits = typeof units === "number" && Number.isFinite(units) ? units : 0;
  const safeCapacity =
    typeof capacity === "number" && Number.isFinite(capacity) && capacity > 0
      ? capacity
      : DEFAULT_CAPACITY;

  const utilization = safeCapacity > 0 ? safeUnits / safeCapacity : 0;

  let level = "EMPTY";
  if (safeUnits <= 0) {
    level = "EMPTY";
  } else if (utilization < 0.4) {
    level = "LOW";
  } else if (utilization < 0.75) {
    level = "MEDIUM";
  } else {
    level = "HIGH";
  }

  return {
    units: safeUnits,
    capacity: safeCapacity,
    utilizationPct: utilization,
    level,
    isLowOrEmpty: level === "EMPTY" || level === "LOW",
  };
}

/**
 * Escape user input before building a RegExp to prevent SyntaxError / ReDoS.
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse a YYYY-MM-DD date string or Date into local midnight safely.
 */
function parseLocalDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

module.exports = {
  BLOOD_TYPES,
  DEFAULT_CAPACITY,
  classifyStockLevel,
  escapeRegex,
  parseLocalDate,
};
