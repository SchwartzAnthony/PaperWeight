// modules/logic/reflection_engine.js
// Analyzes reflection entries and activity to compute consistency and drift risk.
// Pure functions only: no DOM, no storage, no global state access.

/**
 * @typedef {Object} ReflectionEntry
 * @property {string} id            // e.g. "refl_2025_w48"
 * @property {string} date          // ISO date string "YYYY-MM-DD"
 * @property {string} summary
 * @property {number} consistency   // self-rated 0–100
 * @property {string} mood          // e.g. "focused", "tired", "doubtful"
 * @property {string[]} insights
 */

/**
 * @typedef {Object} User
 * @property {Object.<string, string[]>} completed_cards_by_date // key: "YYYY-MM-DD", value: Card.id[]
 */

/**
 * @typedef {Object} ReflectionStats
 * @property {number} avgConsistency        // average self-rated consistency (0–100)
 * @property {number} activityDays          // number of days with at least 1 completed card
 * @property {number} totalDays             // total days in window
 * @property {number} activityRatio         // activityDays / totalDays (0–1)
 * @property {"improving" | "declining" | "stable" | "insufficient_data"} consistencyTrend
 * @property<"low" | "medium" | "high"> driftRisk
 */

/**
 * Options for computing reflection stats.
 * @typedef {Object} ReflectionOptions
 * @property {string} [fromDate]   // "YYYY-MM-DD" inclusive lower bound
 * @property {string} [toDate]     // "YYYY-MM-DD" inclusive upper bound
 */

/**
 * Compute reflection stats over a given time window.
 *
 * Combines:
 * - user.completed_cards_by_date for objective activity
 * - reflections[].consistency for subjective consistency
 *
 * Returns a summary object suitable for UI.
 *
 * @param {User} user
 * @param {ReflectionEntry[]} reflections
 * @param {ReflectionOptions} [options]
 * @returns {ReflectionStats}
 */
export function computeReflectionStats(user, reflections, options = {}) {
  const fromDate = options.fromDate ? parseDate(options.fromDate) : null;
  const toDate = options.toDate ? parseDate(options.toDate) : null;

  const filteredReflections = reflections.filter((r) =>
    isDateInRange(r.date, fromDate, toDate)
  );

  const avgConsistency = computeAverageConsistency(filteredReflections);

  const {
    activityDays,
    totalDays,
    activityRatio,
  } = computeActivityStats(user, fromDate, toDate);

  const consistencyTrend = computeConsistencyTrend(reflections, {
    fromDate,
    toDate,
  });

  const driftRisk = computeDriftRisk(avgConsistency, activityRatio, consistencyTrend);

  return {
    avgConsistency,
    activityDays,
    totalDays,
    activityRatio,
    consistencyTrend,
    driftRisk,
  };
}

// ============================
// Consistency helpers
// ============================

/**
 * Compute average self-rated consistency (0–100)
 * @param {ReflectionEntry[]} reflections
 * @returns {number}
 */
function computeAverageConsistency(reflections) {
  if (!reflections.length) return 0;
  const sum = reflections.reduce(
    (acc, r) => acc + (typeof r.consistency === "number" ? r.consistency : 0),
    0
  );
  return sum / reflections.length;
}

/**
 * Compute consistency trend as "improving", "declining", "stable", or "insufficient_data".
 *
 * Basic strategy v1:
 * - Sort reflections by date
 * - Split into two halves (older vs newer)
 * - Compare average consistency of each half
 *
 * @param {ReflectionEntry[]} reflections
 * @param {{ fromDate: Date | null, toDate: Date | null }} range
 * @returns {"improving" | "declining" | "stable" | "insufficient_data"}
 */
function computeConsistencyTrend(reflections, range) {
  const { fromDate, toDate } = range;

  // Filter by range
  const inRange = reflections
    .filter((r) => isDateInRange(r.date, fromDate, toDate))
    .sort((a, b) => compareDateStrings(a.date, b.date));

  if (inRange.length < 4) {
    return "insufficient_data";
  }

  const mid = Math.floor(inRange.length / 2);
  const older = inRange.slice(0, mid);
  const newer = inRange.slice(mid);

  const avgOld = computeAverageConsistency(older);
  const avgNew = computeAverageConsistency(newer);

  const delta = avgNew - avgOld;

  const threshold = 5; // 5 points difference to call it a real trend

  if (delta > threshold) return "improving";
  if (delta < -threshold) return "declining";
  return "stable";
}

// ============================
// Activity helpers
// ============================

/**
 * Compute activity stats:
 * - days with at least 1 completed card
 * - total days in date range
 *
 * If fromDate/toDate are null, we infer range from completed_cards_by_date.
 *
 * @param {User} user
 * @param {Date | null} fromDate
 * @param {Date | null} toDate
 */
function computeActivityStats(user, fromDate, toDate) {
  const completedByDate = user.completed_cards_by_date || {};

  const allDates = Object.keys(completedByDate);
  if (!allDates.length) {
    return {
      activityDays: 0,
      totalDays: 0,
      activityRatio: 0,
    };
  }

  // If range not provided, infer from earliest to latest completed date
  let rangeStart = fromDate;
  let rangeEnd = toDate;

  if (!rangeStart || !rangeEnd) {
    const sortedDates = [...allDates].sort(compareDateStrings);
    if (!rangeStart) {
      rangeStart = parseDate(sortedDates[0]);
    }
    if (!rangeEnd) {
      rangeEnd = parseDate(sortedDates[sortedDates.length - 1]);
    }
  }

  if (!rangeStart || !rangeEnd) {
    return {
      activityDays: 0,
      totalDays: 0,
      activityRatio: 0,
    };
  }

  // Count days with activity in range
  let activityDays = 0;
  for (const dateStr of allDates) {
    const d = parseDate(dateStr);
    if (d >= rangeStart && d <= rangeEnd) {
      const arr = completedByDate[dateStr] || [];
      if (arr.length > 0) {
        activityDays++;
      }
    }
  }

  const totalDays = diffDaysInclusive(rangeStart, rangeEnd);
  const activityRatio = totalDays > 0 ? activityDays / totalDays : 0;

  return {
    activityDays,
    totalDays,
    activityRatio,
  };
}

// ============================
// Drift risk evaluation
// ============================

/**
 * Compute a simple drift risk level based on:
 * - average consistency
 * - activity ratio (how many days were active)
 * - consistency trend
 *
 * @param {number} avgConsistency        // 0–100
 * @param {number} activityRatio         // 0–1
 * @param {"improving" | "declining" | "stable" | "insufficient_data"} consistencyTrend
 * @returns {"low" | "medium" | "high"}
 */
function computeDriftRisk(avgConsistency, activityRatio, consistencyTrend) {
  // Heuristic v1:
  // - high risk if activity < 0.3 and avgConsistency < 50, or trend is declining
  // - low risk if activity > 0.6 and avgConsistency > 70 and trend is improving/stable
  // - otherwise medium

  if (consistencyTrend === "declining") {
    if (activityRatio < 0.4 || avgConsistency < 60) {
      return "high";
    }
    return "medium";
  }

  if (activityRatio < 0.3 && avgConsistency < 50) {
    return "high";
  }

  if (
    activityRatio > 0.6 &&
    avgConsistency > 70 &&
    (consistencyTrend === "improving" || consistencyTrend === "stable")
  ) {
    return "low";
  }

  return "medium";
}

// ============================
// Date utilities
// ============================

/**
 * Check if a "YYYY-MM-DD" string is within [fromDate, toDate] inclusive.
 * If fromDate/toDate are null, ignored.
 *
 * @param {string} dateStr
 * @param {Date | null} fromDate
 * @param {Date | null} toDate
 * @returns {boolean}
 */
function isDateInRange(dateStr, fromDate, toDate) {
  const d = parseDate(dateStr);
  if (fromDate && d < fromDate) return false;
  if (toDate && d > toDate) return false;
  return true;
}

/**
 * Parse "YYYY-MM-DD" into Date at local midnight.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/**
 * Compare two "YYYY-MM-DD" strings as dates.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareDateStrings(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Compute inclusive difference in days between two Dates.
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
function diffDaysInclusive(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / msPerDay) + 1;
}
