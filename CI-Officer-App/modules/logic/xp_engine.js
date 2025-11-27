// modules/logic/xp_engine.js
// Handles XP gains and skill unlocking.

import {
  computeStreakStats,
  computeXpMultiplier,
} from "./streaks_engine.js";

/**
 * Apply XP for a completed card:
 *  - marks the card as completed on the given date
 *  - computes streak stats and XP multiplier
 *  - applies XP to the relevant domain
 *  - updates completed_skill_nodes if thresholds are hit
 *
 * @param {User} user
 * @param {Card} card
 * @param {SkillNode[]} skillTree
 * @param {{ date?: string }} [options]
 * @returns {User} updated user
 */
export function applyXpForCompletedCard(user, card, skillTree, options = {}) {
  if (!user || !card) return user;

  const date = options.date || getTodayIsoDate();

  // Clone shallow structures we mutate
  const updatedUser = {
    ...user,
    xp_by_domain: { ...(user.xp_by_domain || {}) },
    completed_cards_by_date: { ...(user.completed_cards_by_date || {}) },
    completed_skill_nodes: [...(user.completed_skill_nodes || [])],
  };

  // Mark card as completed on this date (avoid duplicates)
  const byDate = updatedUser.completed_cards_by_date;
  const todaysList = Array.isArray(byDate[date]) ? [...byDate[date]] : [];
  if (!todaysList.includes(card.id)) {
    todaysList.push(card.id);
    byDate[date] = todaysList;
  }

  // Streak stats AFTER this completion
  const streakStats = computeStreakStats(updatedUser);
  const { multiplier } = computeXpMultiplier(streakStats.currentStreak);

  // Apply XP with multiplier
  const baseXp = card.xp_reward || 0;
  const gainedXp = Math.round(baseXp * multiplier);
  const domain = card.domain || "misc";

  if (typeof updatedUser.xp_by_domain[domain] !== "number") {
    updatedUser.xp_by_domain[domain] = 0;
  }
  updatedUser.xp_by_domain[domain] += gainedXp;

  // Optionally, track last gain info for UI
  updatedUser.last_xp_gain = {
    date,
    card_id: card.id,
    domain,
    base_xp: baseXp,
    multiplier,
    gained_xp: gainedXp,
    current_streak: streakStats.currentStreak,
  };

  // Update completed_skill_nodes based on new XP
  unlockCompletedSkills(updatedUser, skillTree);

  return updatedUser;
}

/**
 * Update user.completed_skill_nodes based on XP and prerequisites.
 * Mutates updatedUser in-place.
 *
 * @param {User} updatedUser
 * @param {SkillNode[]} skillTree
 */
function unlockCompletedSkills(updatedUser, skillTree) {
  const completedSet = new Set(updatedUser.completed_skill_nodes || []);
  const xpByDomain = updatedUser.xp_by_domain || {};

  for (const node of skillTree || []) {
    if (completedSet.has(node.id)) continue;

    // Check prerequisites
    const prereqs = node.prerequisites || [];
    const prereqOK = prereqs.every((id) => completedSet.has(id));
    if (!prereqOK) continue;

    // Compute XP available for this node
    const domains = node.domains && node.domains.length ? node.domains : null;
    let totalXp = 0;
    if (domains) {
      for (const d of domains) {
        totalXp += xpByDomain[d] || 0;
      }
    } else {
      // If no domains specified, sum all XP
      totalXp = Object.values(xpByDomain).reduce(
        (acc, v) => acc + (typeof v === "number" ? v : 0),
        0
      );
    }

    if (totalXp >= (node.xp_required || 0)) {
      completedSet.add(node.id);
    }
  }

  updatedUser.completed_skill_nodes = Array.from(completedSet);
}

/**
 * Get today's date as "YYYY-MM-DD".
 */
function getTodayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
