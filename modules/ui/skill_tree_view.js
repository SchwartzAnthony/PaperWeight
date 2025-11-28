// modules/ui/skill_tree_view.js
// Renders the Skill Tree screen (read-only for now).

import { getUser, getSkillTree } from "../core/state.js";
import { computeSkillTreeView } from "../logic/skill_tree_engine.js";
import { navigateTo } from "../core/router.js";

/**
 * Render the Skill Tree view.
 */
export function renderSkillTreeView() {
  const app = document.getElementById("app");
  const state = getUser();
  const skillTree = getSkillTree();
  const user = getUser();

  if (!user || !skillTree) {
    app.innerHTML = "<p>Error: missing user or skill tree data.</p>";
    return;
  }

  const view = computeSkillTreeView(user, skillTree);

  // Group nodes by tier for nicer display
  const byTier = groupByTier(view);

  app.innerHTML = `
    <div class="skilltree-container">
      <h1>Skill Tree</h1>

      <p>
        Status legend:
        <span class="skill-status completed">● Completed</span>
        <span class="skill-status available">● Available</span>
        <span class="skill-status locked">● Locked</span>
      </p>

      ${Object.keys(byTier)
        .sort((a, b) => Number(a) - Number(b))
        .map((tier) => {
          const nodes = byTier[tier];
          return `
            <section class="skill-tier-section">
              <h2>Tier ${tier}</h2>
              <ul class="skill-node-list">
                ${nodes
                  .map((entry) => renderSkillNode(entry))
                  .join("")}
              </ul>
            </section>
          `;
        })
        .join("")}

      <div class="skilltree-footer">
        <button id="btn-skilltree-back">Back to Dashboard</button>
      </div>
    </div>
  `;

  attachSkillTreeHandlers();
}

function buildSkillNodeTooltip(entry, user) {
  const node = entry.node || entry;
  const status = entry.status || node.status;
  const xpByDomain = (user && user.xp_by_domain) || {};

  // Detect requirement fields from the node
  const domain =
    node.xp_domain || node.domain || node.required_domain || null;

  let required =
    typeof node.xp_required === "number"
      ? node.xp_required
      : typeof node.required_xp === "number"
      ? node.required_xp
      : null;

  const nodeName = node.label || node.name || "this skill";

  // No clear XP requirement configured
  if (!domain || required === null) {
    if (status === "completed" || node.unlocked) {
      return `Unlocked: ${nodeName}`;
    }
    return `Locked: ${nodeName} (no XP requirement info)`;
  }

  const current = xpByDomain[domain] || 0;
  const missing = Math.max(0, required - current);

  if (missing <= 0) {
    return `Unlocked – requirement met: ${required} XP in ${domain}`;
  }

  return `Need ${missing} more XP in ${domain} to unlock: ${nodeName}`;
}


/**
 * Group SkillNodeView[] by tier.
 */
function groupByTier(view) {
  const map = {};
  for (const entry of view) {
    const tier = entry.node.tier ?? 0;
    if (!map[tier]) map[tier] = [];
    map[tier].push(entry);
  }
  return map;
}

/**
 * Render a single SkillNodeView as <li>…</li>.
 */
function renderSkillNode(entry) {
  const { node, status, progress } = entry;
  const user = getUser();
  const percentage = Math.round(progress * 100);

  const tooltip = buildSkillNodeTooltip(entry, user);
  const safeTooltip = String(tooltip).replace(/"/g, "&quot;");

  return `
    <li class="skill-node skill-${status}" title="${safeTooltip}">
      <div class="skill-node-header">
        <strong>${node.name}</strong>
        <span class="skill-node-status">${status}</span>
      </div>
      <div class="skill-node-body">
        <p class="skill-node-desc">${node.description}</p>
        <p class="skill-node-meta">
          Category: ${node.category} • XP required: ${node.xp_required}
        </p>
        <div class="skill-node-progress">
          <div class="skill-node-progress-bar">
            <div class="skill-node-progress-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="skill-node-progress-label">${percentage}%</span>
        </div>
      </div>
    </li>
  `;
}


/**
 * Attach handlers (back button).
 */
function attachSkillTreeHandlers() {
  const backBtn = document.getElementById("btn-skilltree-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }
}
