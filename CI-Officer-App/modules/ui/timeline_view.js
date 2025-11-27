// modules/ui/timeline_view.js
// Renders the long-term timeline (phases) screen.

import { getPhases } from "../core/state.js";
import {
  computeTimelineView,
  getCurrentPhase,
} from "../logic/timeline_engine.js";
import { navigateTo } from "../core/router.js";

/**
 * Render the Timeline view.
 */
export function renderTimelineView() {
  const app = document.getElementById("app");
  const phases = getPhases();

  if (!phases || !phases.length) {
    app.innerHTML = `
      <div class="timeline-container">
        <h1>Timeline</h1>
        <p>No phases defined.</p>
        <button id="btn-timeline-back">Back to Dashboard</button>
      </div>
    `;
    attachTimelineHandlers();
    return;
  }

  const timelineView = computeTimelineView(phases);
  const currentPhase = getCurrentPhase(phases);

  app.innerHTML = `
    <div class="timeline-container">
      <h1>Timeline</h1>

      <section class="timeline-current">
        <h2>Current Phase</h2>
        ${
          currentPhase
            ? `
              <p><strong>${currentPhase.name}</strong></p>
              <p>${currentPhase.start_date} → ${currentPhase.end_date}</p>
              <ul>
                ${currentPhase.goals
                  .map((g) => `<li>${g}</li>`)
                  .join("")}
              </ul>
            `
            : `<p>No active phase (you are before the first phase or after the last one).</p>`
        }
      </section>

      <section class="timeline-all">
        <h2>All Phases</h2>
        <ul class="timeline-phase-list">
          ${timelineView
            .map((entry) => renderPhase(entry))
            .join("")}
        </ul>
      </section>

      <div class="timeline-footer">
        <button id="btn-timeline-back">Back to Dashboard</button>
      </div>
    </div>
  `;

  attachTimelineHandlers();
}

/**
 * Render one PhaseView as <li>…</li>.
 */
function renderPhase(entry) {
  const { phase, timeStatus, progress } = entry;
  const pct = Math.round(progress * 100);

  return `
    <li class="timeline-phase timeline-${timeStatus}">
      <div class="timeline-phase-header">
        <strong>${phase.name}</strong>
        <span class="timeline-phase-status">${timeStatus}</span>
      </div>
      <div class="timeline-phase-dates">
        ${phase.start_date} → ${phase.end_date}
      </div>
      <div class="timeline-phase-goals">
        <ul>
          ${phase.goals.map((g) => `<li>${g}</li>`).join("")}
        </ul>
      </div>
      <div class="timeline-phase-progress">
        <div class="timeline-progress-bar">
          <div class="timeline-progress-fill" style="width: ${pct}%"></div>
        </div>
        <span class="timeline-progress-label">${pct}%</span>
      </div>
    </li>
  `;
}

/**
 * Attach handlers (back button).
 */
function attachTimelineHandlers() {
  const backBtn = document.getElementById("btn-timeline-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }
}
