// modules/logic/archive_engine.js
// Long-term archiving and CSV export of user data.

/**
 * Create an archive snapshot from the current user.
 * We store a trimmed copy so you can reset the profile
 * but still keep historical snapshots.
 *
 * @param {User} user
 * @returns {{
 *   id: string,
 *   created_at: string,
 *   label: string,
 *   user_snapshot: any
 * }}
 */
export function createArchiveFromUser(user) {
  const now = new Date();
  const iso = now.toISOString();

  // Simple id: timestamp
  const id = `arch_${iso}`;

  const label = `Archive ${iso.substring(0, 10)} ${iso.substring(11, 19)} UTC`;

  // Shallow copy of user – enough for history
  const snapshot = {
    fid: user.fid,
    name: user.name,
    created_at: user.created_at,
    xp_by_domain: user.xp_by_domain || {},
    completed_cards_by_date: user.completed_cards_by_date || {},
    reflections_by_date: user.reflections_by_date || {},
    current_phase_id: user.current_phase_id || null,
  };

  return {
    id,
    created_at: iso,
    label,
    user_snapshot: snapshot,
  };
}

/**
 * Generate a CSV export from a single user snapshot.
 * Includes:
 *  - Completed cards by date
 *  - XP by domain
 *  - Reflections by date
 *
 * @param {User} user
 * @param {Array<Card>} cards
 * @returns {string} CSV content
 */
export function generateCsvFromUser(user, cards = []) {
  const lines = [];
  const safe = (v) =>
    `"${String(v ?? "")
      .replace(/"/g, '""')
      .replace(/\r?\n/g, " ")}"`;

  // Section: completed missions by date
  lines.push("SECTION,DATE,TYPE,CARD_ID,CARD_TITLE,DOMAIN,XP,NOTES");

  const completed = user.completed_cards_by_date || {};
  const cardMap = new Map((cards || []).map((c) => [c.id, c]));

  const dates = Object.keys(completed).sort();
  for (const date of dates) {
    const ids = completed[date] || [];
    for (const id of ids) {
      const card = cardMap.get(id);
      const title = card ? card.title : id;
      const domain = card ? card.domain : "";
      const xp = card ? card.xp_reward : "";
      lines.push(
        [
          "missions",
          date,
          "card_completed",
          id,
          title,
          domain,
          xp,
          "",
        ]
          .map(safe)
          .join(",")
      );
    }
  }

  // Blank line between sections
  lines.push("");

  // Section: XP by domain
  lines.push("SECTION,DOMAIN,XP");
  const xpByDomain = user.xp_by_domain || {};
  for (const [domain, xp] of Object.entries(xpByDomain)) {
    lines.push(["xp_summary", domain, xp ?? 0].map(safe).join(","));
  }

  lines.push("");

  // Section: Reflections by date
  lines.push("SECTION,DATE,REFLECTION");
  const reflections = user.reflections_by_date || {};
  const reflDates = Object.keys(reflections).sort();
  for (const date of reflDates) {
    const text = reflections[date];
    lines.push(["reflection", date, text].map(safe).join(","));
  }

  return lines.join("\r\n");
}
