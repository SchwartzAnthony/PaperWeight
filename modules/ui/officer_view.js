// modules/ui/officer_view.js
// Renders the Officer Persona character sheet.

import { getUser } from "../core/state.js";
import { computeOfficerStats } from "../logic/officer_engine.js";
import { navigateTo } from "../core/router.js";

export function renderOfficerView() {
  const app = document.getElementById("app");
  const user = getUser();

  if (!user) {
    app.innerHTML = `
      <div class="officer-container">
        <h1>Officer Persona</h1>
        <p>Error: no user loaded.</p>
        <button id="btn-officer-back">Back to Dashboard</button>
      </div>
    `;
    attachOfficerHandlers();
    return;
  }

  const stats = computeOfficerStats(user);

  app.innerHTML = `
    <div class="officer-container">
      <h1>Officer Persona</h1>

      <!-- Header: Level + Rank -->
      <section class="officer-section officer-header">
        <div class="officer-level-circle">
          <div class="officer-level-inner">
            <span class="officer-level-label">LVL</span>
            <span class="officer-level-value">${stats.level}</span>
          </div>
          <div class="officer-level-ring" style="--progress:${(
            stats.progress * 100
          ).toFixed(0)}%;"></div>
        </div>

        <div class="officer-header-text">
          <h2>${stats.rankName}</h2>
          <p>Total XP: <strong>${stats.totalXp}</strong></p>
          ${
            stats.primaryDomain
              ? `<p>Primary specialization: <strong>${stats.primaryDomain}</strong></p>`
              : `<p>No XP yet. Complete missions to define your specialization.</p>`
          }
        </div>
      </section>

      <!-- Level progress bar -->
      <section class="officer-section">
        <h2>Level Progress</h2>
        <div class="officer-level-progress">
          <div class="officer-level-progress-bar">
            <div class="officer-level-progress-fill" style="width:${(
              stats.progress * 100
            ).toFixed(0)}%;"></div>
          </div>
          <div class="officer-level-progress-label">
            ${stats.xpIntoLevel} / ${stats.xpForLevel} XP for next level
          </div>
        </div>
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

      <div class="officer-footer">
        <button id="btn-officer-back">Back to Dashboard</button>
      </div>
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
