// modules/ui/dashboard_view.js
// Renders the main dashboard screen.
// Works with: state.js, router.js, card_selector.js, timeline_engine.js.

import { getState } from "../core/state.js";
import { navigateTo } from "../core/router.js";
import {
  computeTimelineView,
  getCurrentPhase,
} from "../logic/timeline_engine.js";
import {
  computeStreakStats,
  computeXpMultiplier,
  computeStreakBadges,
  computeBonusRolls,
} from "../logic/streaks_engine.js";

/**
 * Render the main dashboard.
 * This overwrites #app completely.
 */
export function renderDashboard() {
  const app = document.getElementById("app");
  const state = getState();

  const user = state.user;
  const cards = state.cards;
  const phases = state.phases;

  // Today’s missions
  const missions = state.todaysMissions || [];

  // XP summary
  const xpSummary = Object.entries(user.xp_by_domain || {})
    .map(([domain, xp]) => `<li><strong>${domain}:</strong> ${xp} XP</li>`)
    .join("");

  // Timeline data
  const timelineView = computeTimelineView(phases);
  const currentPhase = getCurrentPhase(phases);

  // Streak & rewards
  const streakStats = computeStreakStats(user);
  const { multiplier, label: multiplierLabel } = computeXpMultiplier(
    streakStats.currentStreak
  );
  const badges = computeStreakBadges(streakStats);
  const bonusRolls = computeBonusRolls(streakStats.currentStreak);

  app.innerHTML = `
    <div class="dashboard-container">

      <h1>CI Roadmap Dashboard</h1>

      <!-- ---- TODAY’S MISSIONS ---- -->
      <section class="dash-section">
        <h2>Today's Missions</h2>
        ${
          missions.length === 0
            ? `<p>No missions selected yet.</p>`
            : `<ul>${missions
                .map((id) => {
                  const card = cards.find((c) => c.id === id);
                  if (!card) return `<li>${id}</li>`;

                  const tagsHtml =
                    Array.isArray(card.tags) && card.tags.length
                      ? `<div class="mission-tags">
                           ${card.tags
                             .map(
                               (t) =>
                                 `<span class="tag-chip tag-${t.toLowerCase()}">${t}</span>`
                             )
                             .join("")}
                         </div>`
                      : "";

                  return `
                    <li class="mission-item">
                      <strong>${card.title}</strong>
                      <div class="mission-meta">
                        <span>${card.domain} • ${card.xp_reward} XP</span>
                      </div>
                      ${tagsHtml}
                    </li>`;
                })
                .join("")}
              </ul>`
        }
      </section>


      <!-- ---- XP SUMMARY ---- -->
      <section class="dash-section">
        <h2>XP Summary</h2>
        <ul>${xpSummary}</ul>
      </section>

      <!-- ---- STREAK & REWARDS ---- -->
      <section class="dash-section">
        <h2>Streak & Rewards</h2>
        <p><strong>Current streak:</strong> ${streakStats.currentStreak} day(s)</p>
        <p><strong>Best streak:</strong> ${streakStats.bestStreak} day(s)</p>
        <p><strong>XP Multiplier:</strong> ${multiplierLabel}</p>
        <p><strong>Bonus mission rolls today:</strong> ${bonusRolls}</p>
        ${
          badges.length
            ? `<p><strong>Badges:</strong></p>
               <ul>
                 ${badges.map((b) => `<li>${b}</li>`).join("")}
               </ul>`
            : `<p><small>No badges yet. Hit a 3-day streak to earn your first one.</small></p>`
        }
      </section>

      <!-- ---- PHASE PROGRESS ---- -->
      <section class="dash-section">
        <h2>Current Phase</h2>
        ${
          currentPhase
            ? `
              <p><strong>${currentPhase.name}</strong><br>
              ${currentPhase.start_date} → ${currentPhase.end_date}</p>
            `
            : `<p>No active phase.</p>`
        }

        <h3>Timeline Overview</h3>
        <ul>
          ${timelineView
            .map(
              (p) => `
            <li>
              <strong>${p.phase.name}</strong>
              <div>${p.timeStatus} • ${(p.progress * 100).toFixed(0)}%</div>
            </li>`
            )
            .join("")}
        </ul>
      </section>

            <!-- ---- NAVIGATION ---- -->
      <section class="dash-section">
        <h2>Navigation</h2>
        <button data-nav="officer">Officer Sheet</button>
        <button data-nav="missions">Missions</button>
        <button data-nav="skill_tree">Skill Tree</button>
        <button data-nav="timeline">Timeline</button>
        <button data-nav="reflection">Reflection</button>
        <button data-nav="settings">Settings</button>
      </section>

    </div>
  `;

  attachNavigationHandlers();
}

/**
 * Hook up navigation buttons to router.
 */
function attachNavigationHandlers() {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-nav");
      navigateTo(target);
    });
  });
}
