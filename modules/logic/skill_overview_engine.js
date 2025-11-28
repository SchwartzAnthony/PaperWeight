// modules/logic/skill_overview_engine.js
// Computes a compact "skill overview" for the dashboard,
// with infinite levelling per skill node.

/**
 * Compute an overview for each skill node:
 *  - total XP in its domains
 *  - infinite level (0, 1, 2, ...)
 *  - progress within the *current* level (0–1)
 *
 * @param {User} user
 * @param {SkillNode[]} skillTree
 * @returns {Array<{
 *   id: string,
 *   name: string,
 *   category: string,
 *   tier: number,
 *   totalXp: number,
 *   level: number,
 *   levelProgress: number,
 *   levelRequiredXp: number
 * }>}
 */
export function computeSkillOverview(user, skillTree) {
  const xpByDomain = (user && user.xp_by_domain) || {};
  if (!Array.isArray(skillTree)) return [];

  return skillTree.map((node) => {
    const domains = Array.isArray(node.domains) ? node.domains : [];
    const totalXp = domains.reduce(
      (sum, d) => sum + (xpByDomain[d] || 0),
      0
    );

    const baseRequired =
      typeof node.xp_required === "number" && node.xp_required > 0
        ? node.xp_required
        : 500;

    const { level, progress, requiredXp } = computeInfiniteLevel(
      totalXp,
      baseRequired
    );

    return {
      id: node.id,
      name: node.name,
      category: node.category || "general",
      tier: node.tier ?? 0,
      totalXp,
      level,
      levelProgress: progress,
      levelRequiredXp: requiredXp,
    };
  });
}

/**
 * Infinite levelling:
 *  - Level 0 → baseRequired
 *  - Each next level requires ~20% more XP than the previous.
 *  - We consume XP level-by-level until we can't afford the next level.
 *
 * @param {number} totalXp
 * @param {number} baseRequired
 * @returns {{level: number, progress: number, requiredXp: number}}
 */
function computeInfiniteLevel(totalXp, baseRequired) {
  const growth = 1.2; // 20% harder per level
  const MAX_LEVEL = 50;

  let level = 0;
  let required = baseRequired;
  let remaining = Math.max(0, totalXp);

  while (remaining >= required && level < MAX_LEVEL) {
    remaining -= required;
    level += 1;
    required = Math.round(required * growth);
  }

  const progress =
    required > 0 ? Math.max(0, Math.min(1, remaining / required)) : 0;

  return { level, progress, requiredXp: required };
}
