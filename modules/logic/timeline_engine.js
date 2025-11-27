// modules/logic/timeline_engine.js
// Computes current phase and progress along the long-term timeline.
// Pure functions only: no DOM, no storage, no global state access.

/**
 * @typedef {Object} Phase
 * @property {string} id
 * @property {string} name
 * @property {string} start_date   // "YYYY-MM-DD"
 * @property {string} end_date     // "YYYY-MM-DD"
 * @property {string[]} goals
 */

/**
 * @typedef {"past" | "current" | "future"} PhaseTimeStatus
 */

/**
 * @typedef {Object} PhaseView
 * @property {Phase} phase
 * @property {PhaseTimeStatus} timeStatus
 * @property {number} progress   // 0.0 - 1.0 within that phase
 */

/**
 * Options for timeline computation.
 * @typedef {Object} TimelineOptions
 * @property {string} [date]     // "YYYY-MM-DD". If omitted, uses today's date.
 */

/**
 * Compute the current phase for a given date.
 *
 * If the date is before all phases, returns null.
 * If the date is after all phases, returns the last phase.
 *
 * @param {Phase[]} phases
 * @param {TimelineOptions} [options]
 * @returns {Phase | null}
 */
export function getCurrentPhase(phases, options = {}) {
  if (!phases || !phases.length) return null;

  const targetDate = options.date ? parseDate(options.date) : todayDate();

  // Sort phases by start_date just in case
  const sorted = [...phases].sort((a, b) =>
    compareDateStrings(a.start_date, b.start_date)
  );

  let current = null;

  for (const phase of sorted) {
    const start = parseDate(phase.start_date);
    const end = parseDate(phase.end_date);

    if (targetDate >= start && targetDate <= end) {
      // found the active phase
      current = phase;
      break;
    }

    if (targetDate > end) {
      // keep track of the last finished phase in case we're past all
      current = phase;
    }
  }

  return current;
}

/**
 * Compute a timeline view model for all phases.
 * Each phase gets:
 * - timeStatus: "past", "current", or "future"
 * - progress: 0-1 within that phase (current date vs start/end)
 *
 * @param {Phase[]} phases
 * @param {TimelineOptions} [options]
 * @returns {PhaseView[]}
 */
export function computeTimelineView(phases, options = {}) {
  if (!phases || !phases.length) return [];

  const targetDate = options.date ? parseDate(options.date) : todayDate();

  // Sort phases by start_date for consistent display
  const sorted = [...phases].sort((a, b) =>
    compareDateStrings(a.start_date, b.start_date)
  );

  const result = [];

  for (const phase of sorted) {
    const start = parseDate(phase.start_date);
    const end = parseDate(phase.end_date);

    let timeStatus;
    let progress;

    if (targetDate < start) {
      timeStatus = "future";
      progress = 0;
    } else if (targetDate > end) {
      timeStatus = "past";
      progress = 1;
    } else {
      timeStatus = "current";
      progress = computePhaseProgress(targetDate, start, end);
    }

    result.push({
      phase,
      timeStatus,
      progress,
    });
  }

  return result;
}

// ============================
// Helpers for dates & progress
// ============================

/**
 * Parse a "YYYY-MM-DD" string into a Date (local time, midnight).
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // JS Date month is 0-based
  const day = Number(dayStr);
  return new Date(year, month, day);
}

/**
 * Get today's date (local) at midnight.
 * @returns {Date}
 */
function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Compare two "YYYY-MM-DD" strings as dates.
 * Returns:
 *  - negative if a < b
 *  - zero if equal
 *  - positive if a > b
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareDateStrings(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Compute progress 0-1 within a phase:
 * - 0 at start_date
 * - 1 at end_date
 *
 * @param {Date} target
 * @param {Date} start
 * @param {Date} end
 * @returns {number}
 */
function computePhaseProgress(target, start, end) {
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return 1;

  const elapsedMs = target.getTime() - start.getTime();
  const raw = elapsedMs / totalMs;

  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}
