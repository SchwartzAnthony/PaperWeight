// modules/ui/reflection_view.js
// Renders the Reflection screen: list of entries + stats + add form.

import {
  getUser,
  getReflections,
  addReflection,
} from "../core/state.js";
import { computeReflectionStats } from "../logic/reflection_engine.js";
import { navigateTo } from "../core/router.js";

/**
 * Render the Reflection view.
 */
export function renderReflectionView() {
  const app = document.getElementById("app");
  const user = getUser();
  const reflections = getReflections() || [];

  if (!user) {
    app.innerHTML = `
      <div class="reflection-container">
        <h1>Reflection</h1>
        <p>Error: no user loaded.</p>
        <button id="btn-reflection-back">Back to Dashboard</button>
      </div>
    `;
    attachReflectionHandlers();
    return;
  }

  const stats = computeReflectionStats(user, reflections, {});

  app.innerHTML = `
    <div class="reflection-container">
      <h1>Reflection</h1>

      <!-- Stats -->
      <section class="reflection-section">
        <h2>Weekly / Period Stats (Heuristic)</h2>
        <ul class="reflection-stats">
          <li><strong>Average Consistency:</strong> ${stats.avgConsistency.toFixed(
            1
          )} / 100</li>
          <li><strong>Activity Days:</strong> ${stats.activityDays} / ${
    stats.totalDays
  }</li>
          <li><strong>Activity Ratio:</strong> ${(stats.activityRatio * 100).toFixed(
            1
          )}%</li>
          <li><strong>Consistency Trend:</strong> ${stats.consistencyTrend}</li>
          <li><strong>Drift Risk:</strong> ${stats.driftRisk}</li>
        </ul>
        <p style="font-size:0.85em; opacity:0.8;">
          These are rough heuristics combining your completed missions and self-rated consistency,
          meant as a psychological “drift check”, not a diagnosis.
        </p>
      </section>

      <!-- List of previous reflections -->
      <section class="reflection-section">
        <h2>Entries</h2>
        ${
          reflections.length === 0
            ? `<p>No reflections yet. Create your first one below.</p>`
            : `
          <ul class="reflection-list">
            ${reflections
              .slice()
              .sort((a, b) => (a.date < b.date ? 1 : -1)) // newest first
              .map(renderReflectionItem)
              .join("")}
          </ul>
        `
        }
      </section>

      <!-- New reflection form -->
      <section class="reflection-section">
        <h2>Add Reflection</h2>
        <form id="form-reflection">
          <div class="form-field">
            <label>
              Date:
              <input type="date" id="refl-date" value="${getTodayIsoDate()}" />
            </label>
          </div>

          <div class="form-field">
            <label>
              Consistency (0–100):
              <input type="number" id="refl-consistency" min="0" max="100" value="70" />
            </label>
          </div>

          <div class="form-field">
            <label>
              Mood (one or two words):
              <input type="text" id="refl-mood" placeholder="focused, tired, doubtful..." />
            </label>
          </div>

          <div class="form-field">
            <label>
              Summary:
              <textarea id="refl-summary" rows="3"
                placeholder="What went well, what went badly, what you learned..."></textarea>
            </label>
          </div>

          <div class="form-field">
            <label>
              Key insights (separate with ';'):
              <textarea id="refl-insights" rows="2"
                placeholder="Example: Sleep matters more than I admit;I need strict phone rules after 22:00"></textarea>
            </label>
          </div>

          <div class="form-actions">
            <button type="submit">Save Reflection</button>
          </div>
        </form>
      </section>

      <div class="reflection-footer">
        <button id="btn-reflection-back">Back to Dashboard</button>
      </div>
    </div>
  `;

  attachReflectionHandlers();
}

/**
 * Render a single reflection entry as <li>…</li>.
 */
function renderReflectionItem(entry) {
  const insights = entry.insights || [];
  return `
    <li class="reflection-item">
      <div class="reflection-item-header">
        <strong>${entry.date}</strong>
        <span>Consistency: ${entry.consistency}/100</span>
        <span>Mood: ${entry.mood || "-"}</span>
      </div>
      <div class="reflection-item-body">
        <p>${escapeHtml(entry.summary || "")}</p>
        ${
          insights.length
            ? `<ul class="reflection-insights">
                 ${insights.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}
               </ul>`
            : ""
        }
      </div>
    </li>
  `;
}

/**
 * Attach handlers: form submission + back button.
 */
function attachReflectionHandlers() {
  const form = document.getElementById("form-reflection");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSaveReflection();
    });
  }

  const backBtn = document.getElementById("btn-reflection-back");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }
}

/**
 * Handle saving a new reflection entry.
 */
function handleSaveReflection() {
  const dateInput = document.getElementById("refl-date");
  const consInput = document.getElementById("refl-consistency");
  const moodInput = document.getElementById("refl-mood");
  const summaryInput = document.getElementById("refl-summary");
  const insightsInput = document.getElementById("refl-insights");

  if (!dateInput || !consInput || !summaryInput) return;

  const date = dateInput.value || getTodayIsoDate();
  let consistency = parseInt(consInput.value, 10);
  if (isNaN(consistency)) consistency = 0;
  if (consistency < 0) consistency = 0;
  if (consistency > 100) consistency = 100;

  const mood = (moodInput && moodInput.value.trim()) || "";
  const summary = summaryInput.value.trim();
  const insightsRaw = (insightsInput && insightsInput.value.trim()) || "";
  const insights =
    insightsRaw.length > 0
      ? insightsRaw.split(";").map((s) => s.trim()).filter(Boolean)
      : [];

  const entry = {
    id: `refl_${date}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    summary,
    consistency,
    mood,
    insights,
  };

  addReflection(entry);

  console.log("[REFLECTION] Added entry:", entry);

  // Re-render view so list and stats update
  renderReflectionView();
}

/**
 * Get today's date as "YYYY-MM-DD".
 */
function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Very simple HTML escaping to avoid injecting HTML via reflections.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
