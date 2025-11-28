// NOW CALLED STATS IN APP
// modules/ui/officer_view.js
// Renders the Stats screen (domain XP breakdown).

import { getUser } from "../core/state.js";
import { computeOfficerStats } from "../logic/officer_engine.js";
import { navigateTo } from "../core/router.js";
import {
  computeStreakStats,
  computeXpMultiplier,
  computeStreakBadges,
  computeBonusRolls,
} from "../logic/streaks_engine.js";


export function renderOfficerView() {
  const app = document.getElementById("app");
  const user = getUser();

  if (!user) {
    app.innerHTML = `
      <div class="officer-container">
        <h1>Stats</h1>
        <p>Error: no user loaded.</p>
        <section class="officer-section officer-footer">
          <button id="btn-officer-back">Back to Dashboard</button>
        </section>
      </div>
    `;
    attachOfficerHandlers();
    return;
  }

  const stats = computeOfficerStats(user);

    const streak = computeStreakStats(user);
  const { multiplier, label: multiplierLabel } = computeXpMultiplier(
    streak.currentStreak
  );
  const badges = computeStreakBadges(streak);
  const bonusRolls = computeBonusRolls(streak.currentStreak);


   app.innerHTML = `
    <div class="officer-container">
      <h1>Stats</h1>

      <!-- Streak & Rewards -->
      <section class="officer-section">
        <h2>Streak & Rewards</h2>
        <p>
          Current streak:
          <strong>${streak.currentStreak} day${
            streak.currentStreak === 1 ? "" : "s"
          }</strong>
          • Best:
          <strong>${streak.longestStreak} days</strong>
        </p>
        <p>
          XP multiplier:
          <strong>${multiplier.toFixed(2)}×</strong>
          <span class="streak-label">(${multiplierLabel})</span>
        </p>
        <p>
          Bonus mission rerolls today:
          <strong>${bonusRolls}</strong>
        </p>

        ${
          badges && badges.length
            ? `
          <div class="streak-badges">
            ${badges
              .map(
                (b) => `
              <span class="streak-badge">
                ${b.label}
              </span>
            `
              )
              .join("")}
          </div>`
            : ""
        }
      </section>

      <!-- Domain breakdown -->
      <section class="officer-section">
        <h2>Domain Breakdown</h2>
        ${
          stats.domainBreakdown.length === 0
            ? `<p>No XP yet recorded.</p>`
            : `
          <ul class="officer-domain-list">
            ${stats.domainBreakdown
              .map((d) => {
                const pct = Math.round(d.share * 100);
                return `
                  <li class="officer-domain-item">
                    <div class="officer-domain-header">
                      <span>${d.domain}</span>
                      <span>${d.xp} XP (${pct}%)</span>
                    </div>
                    <div class="officer-domain-bar">
                      <div class="officer-domain-bar-fill officer-domain-${d.domain}" style="width:${pct}%;"></div>
                    </div>
                  </li>
                `;
              })
              .join("")}
          </ul>`
        }
      </section>

      <section class="officer-section officer-footer">
        <button id="btn-officer-back">Back to Dashboard</button>
      </section>
    </div>
  `;


  attachOfficerHandlers();
}

function attachOfficerHandlers() {
  const backBtn = document.getElementById("btn-officer-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }
}
