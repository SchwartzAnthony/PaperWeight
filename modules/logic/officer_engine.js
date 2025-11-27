// modules/logic/officer_engine.js
// Computes Officer Persona stats from user XP.

/**
 * Compute officer stats from user XP.
 *
 * Level model (simple for now):
 *  - totalXp = sum of xp_by_domain
 *  - levelSize = 100 XP
 *  - level = floor(totalXp / levelSize) + 1
 *
 * @param {User} user
 * @returns {{
 *   totalXp: number,
 *   level: number,
 *   xpIntoLevel: number,
 *   xpForLevel: number,
 *   progress: number, // 0..1
 *   primaryDomain: string | null,
 *   domainBreakdown: { domain: string, xp: number, share: number }[],
 *   rankName: string
 * }}
 */
export function computeOfficerStats(user) {
  const xpByDomain = user?.xp_by_domain || {};
  const entries = Object.entries(xpByDomain);

  let totalXp = 0;
  for (const [, xp] of entries) {
    if (typeof xp === "number") totalXp += xp;
  }

  const levelSize = 100;
  const level = Math.max(1, Math.floor(totalXp / levelSize) + 1);
  const xpIntoLevel = totalXp % levelSize;
  const xpForLevel = levelSize;
  const progress = xpForLevel === 0 ? 0 : xpIntoLevel / xpForLevel;

  // Domain breakdown
  const domainBreakdown = entries
    .map(([domain, xp]) => ({
      domain,
      xp: typeof xp === "number" ? xp : 0,
    }))
    .sort((a, b) => b.xp - a.xp);

  const primaryDomain =
    domainBreakdown.length > 0 ? domainBreakdown[0].domain : null;

  // Shares
  for (const d of domainBreakdown) {
    d.share = totalXp > 0 ? d.xp / totalXp : 0;
  }

  const rankName = getRankName(level);

  return {
    totalXp,
    level,
    xpIntoLevel,
    xpForLevel,
    progress,
    primaryDomain,
    domainBreakdown,
    rankName,
  };
}

/**
 * Simple rank ladder based on level.
 */
function getRankName(level) {
  if (level >= 20) return "Prime Architect";
  if (level >= 15) return "Senior Strategist";
  if (level >= 10) return "Field Architect";
  if (level >= 7) return "Senior Operator";
  if (level >= 4) return "Junior Operator";
  return "Initiate";
}
