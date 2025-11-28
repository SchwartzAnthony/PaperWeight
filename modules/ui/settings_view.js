// modules/ui/settings_view.js
// Renders basic settings for the Prime Officer app.

import {
  getUser,
  setUser,
  getCards,
  setTodaysMissions,
} from "../core/state.js";
import { saveUser, resetUser } from "../core/storage.js";
import { selectDailyCardIds } from "../logic/card_selector.js";
import { navigateTo } from "../core/router.js";
import { applyTheme } from "./theme.js";
import { loadArchives, saveArchives } from "../core/storage.js";


/**
 * Render the Settings view.
 */
export function renderSettingsView() {
  const app = document.getElementById("app");
  const user = getUser();

  if (!user) {
    app.innerHTML = `
      <div class="settings-container">
        <h1>Settings</h1>
        <p>Error: no user loaded.</p>
        <button id="btn-settings-back">Back to Dashboard</button>
      </div>
    `;
    attachSettingsHandlers();
    return;
  }

  const dailyCount =
    (user.settings && user.settings.daily_card_count) || 5;
  const theme = (user.settings && user.settings.theme) || "dark";

app.innerHTML = `
  <div class="settings-container">
    <h1>Settings</h1>

    <section class="settings-section">
      <h2>Daily Missions</h2>
      <label>
        Number of missions per day:
        <input
          id="input-daily-count"
          type="number"
          min="1"
          max="20"
          value="${dailyCount}"
        />
      </label>
    </section>

    <section class="settings-section">
      <h2>Appearance</h2>
      <label>
        Theme:
        <select id="select-theme">
          <option value="dark" ${theme === "dark" ? "selected" : ""}>Dark</option>
          <option value="light" ${theme === "light" ? "selected" : ""}>Light</option>
        </select>
      </label>
      <button id="btn-save-settings">Save Settings</button>
    </section>

    <section class="settings-section">
      <h2>Profile</h2>
      <p>
        Resetting your profile will clear all XP, completed missions,
        and reflections, and reload the default template.
      </p>
      <button id="btn-reset-profile">Reset Profile</button>
    </section>

    <section class="settings-section">
  <h2>Data & Archive</h2>
  <p>You can create local archive snapshots and export your current profile as CSV for long-term backup.</p>
  <button id="btn-create-archive">Create Archive Snapshot</button>
  <button id="btn-export-csv">Download CSV (current profile)</button>
</section>


    <div class="settings-footer">
      <button id="btn-settings-back">Back to Dashboard</button>
    </div>
  </div>
`;


  attachSettingsHandlers();
}

/**
 * Attach event handlers for settings interactions.
 */
function attachSettingsHandlers() {
  const saveBtn = document.getElementById("btn-save-settings");
  const resetBtn = document.getElementById("btn-reset-profile");
  const backBtn = document.getElementById("btn-settings-back");

  if (saveBtn) {
    saveBtn.addEventListener("click", handleSaveSettings);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", handleResetProfile);
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }
}

/**
 * Save daily mission count to user.settings and regenerate today's missions.
 */
function handleSaveSettings() {
  const input = document.getElementById("input-daily-count");
  const themeSelect = document.getElementById("select-theme");
  if (!input || !themeSelect) return;

  const raw = input.value;
  let value = parseInt(raw, 10);
  if (isNaN(value) || value < 1) value = 1;
  if (value > 20) value = 20;

  const theme = themeSelect.value === "light" ? "light" : "dark";

  const user = getUser();
  if (!user) return;

  const updatedUser = {
    ...user,
    settings: {
      ...(user.settings || {}),
      daily_card_count: value,
      theme,
    },
  };

  setUser(updatedUser);
  saveUser(updatedUser);

  // Apply theme immediately
  applyTheme(theme);

  // Regenerate today's missions with new count
  const cards = getCards();
  const todaysIds = selectDailyCardIds(updatedUser, cards, {
    count: value,
  });
  setTodaysMissions(todaysIds);

  console.log("[SETTINGS] Saved daily_card_count =", value, "theme =", theme);

  renderSettingsView();
}


/**
 * Reset profile to template and regenerate today's missions.
 * This is async because resetUser() loads template JSON.
 */
async function handleResetProfile() {
  const confirmReset = window.confirm(
    "Reset profile? This will clear all XP and progress."
  );
  if (!confirmReset) return;

  const newUser = await resetUser();
  setUser(newUser);

  const cards = getCards();
  const todaysIds = selectDailyCardIds(newUser, cards, {});
  setTodaysMissions(todaysIds);

  console.log("[SETTINGS] Profile reset.");

  // After reset, go back to dashboard
  navigateTo("dashboard");
}
