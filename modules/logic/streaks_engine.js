// modules/logic/streaks_engine.js
// Streaks, multipliers, badges, and mission bonus rolls.
// Pure logic, no DOM or storage.

/**
 * Compute streak stats from a user's completed_cards_by_date.
 *
 * currentStreak: how many *consecutive* days up to today you were active.
 * bestStreak: longest streak in history.
 * lastActiveDate: last date where at least one card was completed.
 *
 * @param {User} user
 * @returns {{ currentStreak: number, bestStreak: number, lastActiveDate: string | null }}
 */
export function computeStreakStats(user) {
  const completed = user.completed_cards_by_date || {};
  const activeDates = Object.keys(completed).filter((d) => {
    const arr = completed[d];
    return Array.isArray(arr) && arr.length > 0;
  });

  if (activeDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastActiveDate: null,
    };
  }

  const sorted = activeDates.slice().sort((a, b) => (a < b ? -1 : 1));
  const dateSet = new Set(sorted);

  const lastActiveDate = sorted[sorted.length - 1];

  const todayStr = getTodayIsoDate();
  const today = parseDate(todayStr);

  // --- current streak (backwards from today) ---
  let currentStreak = 0;
  let cursor = todayStr;
  while (dateSet.has(cursor)) {
    currentStreak++;
    const prev = addDays(parseDate(cursor), -1);
    cursor = toIsoDate(prev);
  }

  // --- best streak (scan all sequences) ---
  let bestStreak = 0;
  for (const dateStr of sorted) {
    const d = parseDate(dateStr);
    const prevStr = toIsoDate(addDays(d, -1));
    // Only start counting if this is the *start* of a streak
    if (!dateSet.has(prevStr)) {
      let streakLen = 0;
      let innerCursor = dateStr;
      while (dateSet.has(innerCursor)) {
        streakLen++;
        const next = addDays(parseDate(innerCursor), 1);
        innerCursor = toIsoDate(next);
      }
      if (streakLen > bestStreak) bestStreak = streakLen;
    }
  }

  return {
    currentStreak,
    bestStreak,
    lastActiveDate,
  };
}

/**
 * Compute XP multiplier from current streak.
 *
 * Simple heuristic:
 *  - 0–2 days: x1.0
 *  - 3–6 days: x1.1
 *  - 7–13 days: x1.2
 *  - 14–29 days: x1.3
 *  - 30+ days: x1.5
 *
 * @param {number} currentStreak
 * @returns {{ multiplier: number, label: string }}
 */
export function computeXpMultiplier(currentStreak) {
  let multiplier = 1.0;
  let label = "x1.0 (no streak bonus)";

  if (currentStreak >= 30) {
    multiplier = 1.5;
    label = "x1.5 (30+ day streak)";
  } else if (currentStreak >= 14) {
    multiplier = 1.3;
    label = "x1.3 (14+ day streak)";
  } else if (currentStreak >= 7) {
    multiplier = 1.2;
    label = "x1.2 (7+ day streak)";
  } else if (currentStreak >= 3) {
    multiplier = 1.1;
    label = "x1.1 (3+ day streak)";
  }

  return { multiplier, label };
}

/**
 * Compute badge labels from streak stats.
 *
 * Badges are just strings for now; later they could map to icons.
 *
 * @param {{ currentStreak: number, bestStreak: number }} stats
 * @returns {string[]}
 */
export function computeStreakBadges(stats) {
  const badges = [];

  if (stats.bestStreak >= 3) {
    badges.push("Consistency Spark (3+ streak once)");
  }
  if (stats.bestStreak >= 7) {
    badges.push("Weekly Warrior (7+ streak once)");
  }
  if (stats.bestStreak >= 30) {
    badges.push("Unbreakable Chain (30+ streak once)");
  }
  if (stats.currentStreak >= 7) {
    badges.push("On Fire (7+ current streak)");
  }

  return badges;
}

/**
 * Compute how many bonus mission rolls you get today,
 * based on current streak.
 *
 *  - <7: 0 bonus rolls
 *  - 7–13: 1 bonus roll
 *  - 14+: 2 bonus rolls
 *
 * @param {number} currentStreak
 * @returns {number}
 */
export function computeBonusRolls(currentStreak) {
  if (currentStreak >= 14) return 2;
  if (currentStreak >= 7) return 1;
  return 0;
}

// ==============
// Date helpers
// ==============

function getTodayIsoDate() {
  const now = new Date();
  return toIsoDate(now);
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function addDays(date, delta) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + delta);
  return result;
}
