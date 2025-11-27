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
  const user = getUser();
  const skillTree = getSkillTree();

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

  const percentage = Math.round(progress * 100);

  return `
    <li class="skill-node skill-${status}">
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
