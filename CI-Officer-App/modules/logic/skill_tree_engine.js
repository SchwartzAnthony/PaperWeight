// modules/logic/skill_tree_engine.js
// Computes status and progress for each skill node in the tree.
// Pure functions only: no DOM, no storage, no global state access.

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {Object.<string, number>} xp_by_domain
 * @property {string[]} completed_skill_nodes
 */

/**
 * @typedef {Object} SkillNode
 * @property {string} id
 * @property {number} tier
 * @property {string} name
 * @property {string} description
 * @property {string} category
 * @property {string[]} prerequisites
 * @property {number} xp_required
 * @property {string[]} domains
 */

/**
 * @typedef {"locked" | "available" | "completed"} SkillNodeStatus
 */

/**
 * @typedef {Object} SkillNodeView
 * @property {SkillNode} node
 * @property {SkillNodeStatus} status
 * @property {number} progress   // 0.0 - 1.0 (can be >1.0 if overleveled, but we clamp)
 */

/**
 * Compute the view model for the entire skill tree for a given user.
 *
 * Rules:
 * - "completed":
 *     - node.id is in user.completed_skill_nodes
 * - "available":
 *     - not completed
 *     - all prerequisites are completed
 * - "locked":
 *     - not completed
 *     - at least one prerequisite is NOT completed
 *
 * progress:
 * - sum XP over node.domains, divide by node.xp_required
 * - clamp between 0 and 1
 *
 * @param {User} user
 * @param {SkillNode[]} skillTree
 * @returns {SkillNodeView[]}
 */
export function computeSkillTreeView(user, skillTree) {
  const xpByDomain = user?.xp_by_domain || {};
  const completedSet = new Set(user?.completed_skill_nodes || []);

  // Build quick lookup for completion to check prerequisites
  const result = [];

  for (const node of skillTree) {
    const isCompleted = completedSet.has(node.id);

    const allPrereqsMet = arePrerequisitesMet(node, completedSet);
    const status = determineStatus(isCompleted, allPrereqsMet);

    const totalXp = sumXpForNode(node, xpByDomain);
    const progress = computeProgress(totalXp, node.xp_required);

    result.push({
      node,
      status,
      progress,
    });
  }

  return result;
}

// ============================
// Helpers
// ============================

/**
 * Check if all prerequisites of a node are completed.
 *
 * @param {SkillNode} node
 * @param {Set<string>} completedSet
 * @returns {boolean}
 */
function arePrerequisitesMet(node, completedSet) {
  const prereqs = node.prerequisites || [];
  if (!prereqs.length) return true;

  for (const preId of prereqs) {
    if (!completedSet.has(preId)) {
      return false;
    }
  }
  return true;
}

/**
 * Determine status from completion and prerequisites.
 *
 * @param {boolean} isCompleted
 * @param {boolean} allPrereqsMet
 * @returns {SkillNodeStatus}
 */
function determineStatus(isCompleted, allPrereqsMet) {
  if (isCompleted) return "completed";
  if (allPrereqsMet) return "available";
  return "locked";
}

/**
 * Sum XP across all domains associated with a node.
 *
 * @param {SkillNode} node
 * @param {Object.<string, number>} xpByDomain
 * @returns {number}
 */
function sumXpForNode(node, xpByDomain) {
  const domains = node.domains || [];
  let total = 0;
  for (const d of domains) {
    total += xpByDomain[d] || 0;
  }
  return total;
}

/**
 * Compute progress ratio (0–1) from total XP and required XP.
 *
 * @param {number} totalXp
 * @param {number} xpRequired
 * @returns {number}
 */
function computeProgress(totalXp, xpRequired) {
  if (!xpRequired || xpRequired <= 0) return 1;
  const ratio = totalXp / xpRequired;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}
