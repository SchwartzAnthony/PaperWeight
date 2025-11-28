// modules/ui/dashboard_view.js
// Renders the main dashboard screen.
// Works with: state.js, router.js, card_selector.js, timeline_engine.js.

import { getState, getUser, setUser, getSkillTree} from "../core/state.js";
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
import { saveUser } from "../core/storage.js";
import { computeSkillOverview } from "../logic/skill_overview_engine.js";
import { computeOfficerStats } from "../logic/officer_engine.js";



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
  const officer = computeOfficerStats(user);


  // Today’s missions
  const missions = state.todaysMissions || [];

    const skillTree = state.skillTree || getSkillTree() || [];
  const skillOverview = computeSkillOverview(user, skillTree);
  const selectedSkill = skillOverview[0] || null;


    const routine = user.workout_routine || null;

  const today = new Date().toISOString().slice(0, 10);
  const completedWorkout = !!(
    user.workout_completion_by_date &&
    user.workout_completion_by_date[today] &&
    user.workout_completion_by_date[today].completed
  );

  // XP history mode & data
  const xpMode =
    (user.settings && user.settings.xp_view_mode) || "days";
  const xpHistoryPoints = computeXpHistory(user, cards, xpMode);
  const xpHistorySvg = buildXpHistorySvg(xpHistoryPoints, xpMode);


  // XP summary
  const xpSummary = Object.entries(user.xp_by_domain || {})
    .map(([domain, xp]) => `<li><strong>${domain}:</strong> ${xp} XP</li>`)
    .join("");

  // Timeline data
  const timelineView = computeTimelineView(phases);
  const currentPhase = getCurrentPhase(phases);


  app.innerHTML = `
    <div class="dashboard-container">

      <h1>CI Roadmap Dashboard</h1>

      
      <!-- ---- OFFICER SUMMARY (GLOBAL LEVEL) ---- -->
      <section class="dash-section officer-summary">
        <div class="officer-section officer-header">
          <div class="officer-level-circle">
            <div class="officer-level-inner">
              <span class="officer-level-label">LVL</span>
              <span class="officer-level-value">${officer.level}</span>
            </div>
            <div class="officer-level-ring" style="--progress:${(
              officer.progress * 100
            ).toFixed(0)}%;"></div>
          </div>

          <div class="officer-header-text">
            <h2>${officer.rankName}</h2>
            <p>Total XP: <strong>${officer.totalXp}</strong></p>
            ${
              officer.primaryDomain
                ? `<p>Primary specialization: <strong>${officer.primaryDomain}</strong></p>`
                : `<p>No XP yet. Complete missions to define your specialization.</p>`
            }
          </div>
        </div>

        <section class="officer-section">
          <h2>Level Progress</h2>
          <div class="officer-level-progress">
            <div class="officer-level-progress-bar">
              <div class="officer-level-progress-fill" style="width:${(
                officer.progress * 100
              ).toFixed(0)}%;"></div>
            </div>
            <div class="officer-level-progress-label">
              ${officer.xpIntoLevel} / ${officer.xpForLevel} XP for next level
            </div>
          </div>
        </section>
      </section>

            <!-- ---- PINNACLE GOALS ---- -->
      <section class="dash-section pinnacle-section">
        <h2>Your Pinnacle Goals</h2>

        <div class="pinnacle-grid">

          <!-- Physical -->
          <div class="pinnacle-card">
            <div class="pinnacle-icon">🏅</div>
            <div class="pinnacle-title">Ironman World Championship</div>
            <div class="pinnacle-subtitle">Kona Qualifier</div>
          </div>

          <!-- Career -->
          <div class="pinnacle-card">
            <div class="pinnacle-icon">🛡️</div>
            <div class="pinnacle-title">Senior Counterintelligence Analyst</div>
            <div class="pinnacle-subtitle">Strategic Directorate</div>
          </div>

          <!-- Academic -->
          <div class="pinnacle-card">
            <div class="pinnacle-icon">🎓</div>
            <div class="pinnacle-title">Doctorate (PhD)</div>
            <div class="pinnacle-subtitle">Intelligence & Security Studies</div>
          </div>

        </div>
      </section>





            <!-- ---- TODAY'S WORKOUT (NON-NEGOTIABLE) ---- -->
      <section class="dash-section">
        <h2>Today's Workout</h2>
        ${
          routine
            ? `
              <p><strong>${routine.name}</strong></p>
              <p>Status: ${
                completedWorkout
                  ? '<span class="workout-status ok">Completed</span>'
                  : '<span class="workout-status pending">Not completed</span>'
              }</p>
              <button data-nav="workouts">Open Workouts</button>
            `
            : `
              <p>No workout routine configured yet.</p>
              <button data-nav="workouts">Set up routine</button>
            `
        }
      </section>


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

                  // Build tags if present
                  const tagsHtml = (card.tags || [])
                    .map((tag) => {
                      const label = String(tag);
                      const tagClass = label
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-");
                      return `<span class="mission-tag mission-tag-${tagClass}">${label}</span>`;
                    })
                    .join("");

                  return `
                    <li class="mission-item">
                      <div class="mission-main-line">
                        <strong>${card.title}</strong>
                        <span class="mission-meta">
                          ${card.domain} • ${card.xp_reward} XP
                        </span>
                      </div>
                      ${
                        tagsHtml
                          ? `<div class="mission-tags">${tagsHtml}</div>`
                          : ""
                      }
                    </li>`;
                })
                .join("")}
              </ul>`
        }

        <button data-nav="missions" class="dash-missions-btn">
          Open Missions
        </button>
      </section>





              <!-- ---- SKILL PROGRESS OVERVIEW ---- -->
      <section class="dash-section">
        <h2>Skill Progress</h2>

        ${
          !skillOverview.length
            ? `<p>No skills defined yet.</p>`
            : `
          <div class="skill-strip-container">
            <div class="skill-strip-list">
              ${skillOverview
                .map(
                  (s, idx) => `
                <button
                  class="skill-strip-item ${
                    idx === 0 ? "selected" : ""
                  }"
                  data-skill-id="${s.id}"
                >
                  <div class="skill-strip-item-name">${s.name}</div>
                  <div class="skill-strip-item-meta">
                    ${s.category} • Lvl ${s.level}
                  </div>
                </button>
              `
                )
                .join("")}
            </div>

            <div class="skill-strip-detail">
              ${buildSkillStripDetail(selectedSkill)}
            </div>
          </div>
        `
        }
      </section>
            <!-- ---- XP SUMMARY + HISTORY ---- -->
      <section class="dash-section">
        <h2>XP Summary</h2>

        <div class="xp-history-header">
          <h3 class="xp-history-title">
            XP over time (${xpMode})
          </h3>
          <button id="btn-xp-mode">Data Settings</button>
        </div>

        <div class="xp-history-wrapper">
          ${xpHistorySvg}
        </div>

        <ul>${xpSummary}</ul>
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
        <button data-nav="officer">Stats</button>
        <button data-nav="skill_tree">Skill Tree</button>
        <button data-nav="timeline">Phases</button>
        <button data-nav="reflection">Reflection</button>
        <button data-nav="settings">Settings</button>
      </section>

    </div>
  `;

function computeXpHistory(user, cards, mode) {
  const log = user.completed_cards_by_date || {};
  const cardMap = new Map((cards || []).map((c) => [c.id, c]));

  const buckets = new Map(); // key -> total XP
  const labels = new Map();  // key -> display label

  const entries = Object.entries(log); // [dateString, cardIds[]]

  for (const [dateStr, ids] of entries) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) continue;

    let key;
    let label;

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1–12
    const day = d.getDate();

    if (mode === "years") {
      key = String(year);
      label = String(year);
    } else if (mode === "months") {
      const mm = String(month).padStart(2, "0");
      key = `${year}-${mm}`;
      label = `${mm}/${String(year).slice(-2)}`;
    } else if (mode === "weeks") {
      // very rough week bucket: year + week-of-year
      const startOfYear = new Date(year, 0, 1);
      const diff = d - startOfYear;
      const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
      const ww = String(week).padStart(2, "0");
      key = `${year}-W${ww}`;
      label = `W${ww}`;
    } else {
      // "days" (default)
      key = dateStr; // ISO yyyy-mm-dd
      label = dateStr.slice(5); // mm-dd
    }

    let total = buckets.get(key) || 0;
    for (const id of ids || []) {
      const card = cardMap.get(id);
      const xp = card ? card.xp_reward || 0 : 0;
      total += xp;
    }
    buckets.set(key, total);
    labels.set(key, label);
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((key) => ({
    key,
    label: labels.get(key),
    value: buckets.get(key) || 0,
  }));
}

function buildXpHistorySvg(points, mode) {
  if (!points.length) {
    return `<p class="xp-history-empty">No XP history yet. Complete missions to see your trend.</p>`;
  }

  const width = 360;
  const height = 140;
  const margin = { left: 16, right: 8, top: 10, bottom: 24 };

  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const maxValue = points.reduce((m, p) => Math.max(m, p.value), 0) || 1;

  const stepX =
    points.length > 1 ? chartW / (points.length - 1) : chartW / 2;

  function xFor(i) {
    if (points.length === 1) return margin.left + chartW / 2;
    return margin.left + i * stepX;
  }

  function yFor(v) {
    const ratio = v / maxValue;
    return margin.top + (1 - ratio) * chartH;
  }

  // Build polyline/path
  let path = "";
  points.forEach((p, i) => {
    const x = xFor(i);
    const y = yFor(p.value);
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  // Axis labels (limit to at most 8 labels to avoid clutter)
  const labelEvery =
    points.length <= 8 ? 1 : Math.ceil(points.length / 8);

  const labelsSvg = points
    .map((p, i) => {
      if (i % labelEvery !== 0) return "";
      const x = xFor(i);
      const y = height - 6;
      return `<text x="${x}" y="${y}" text-anchor="middle" class="xp-axis-label">${p.label}</text>`;
    })
    .join("");

  const dotsSvg = points
    .map((p, i) => {
      const x = xFor(i);
      const y = yFor(p.value);
      return `<circle cx="${x}" cy="${y}" r="2.5" class="xp-point"></circle>`;
    })
    .join("");

  return `
    <svg class="xp-history-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="xpLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="var(--progress-primary-start)" stop-opacity="0.9" />
          <stop offset="100%" stop-color="var(--progress-primary-end)" stop-opacity="0.6" />
        </linearGradient>
      </defs>
      <g>
        <!-- X axis -->
        <line
          x1="${margin.left}"
          y1="${height - margin.bottom}"
          x2="${width - margin.right}"
          y2="${height - margin.bottom}"
          class="xp-axis"
        ></line>

        <!-- Line -->
        <path d="${path}" class="xp-line"></path>

        <!-- Dots -->
        ${dotsSvg}

        <!-- Labels -->
        ${labelsSvg}
      </g>
    </svg>
  `;
}

function buildSkillStripDetail(info) {
  if (!info) {
    return `<p class="skill-strip-meta">No skill selected.</p>`;
  }

  const level = info.level || 0;
  const pct = Math.round((info.levelProgress || 0) * 100);

  function box(label, isActive) {
    const extraClass = isActive
      ? " skill-strip-box-active"
      : " skill-strip-box-future";

    const inner = isActive
      ? `
        <div class="skill-strip-progress">
          <div class="skill-strip-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="skill-strip-progress-label">${pct}% to next level</div>
      `
      : "";

    return `
      <div class="skill-strip-box${extraClass}">
        <div class="skill-strip-box-title">${label}</div>
        ${inner}
      </div>
    `;
  }

  const box1 = box(`Lv ${level}`, true);
  const box2 = box(`Lv ${level + 1}`, false);
  const box3 = box(`Lv ${level + 2}`, false);

  const arrow = `<div class="skill-strip-arrow">➜</div>`;

  return `
    <div class="skill-strip-flow">
      ${box1}
      ${arrow}
      ${box2}
      ${arrow}
      ${box3}
    </div>
    <p class="skill-strip-meta">
      Total XP in this skill’s domains: ${info.totalXp} •
      XP needed this level: ${info.levelRequiredXp}
    </p>
  `;
}

/**
 * Let the user click skill items on the left and update the
 * 3-box flow on the right without re-rendering the whole dashboard.
 */
function attachSkillStripHandlers(skillOverview) {
  if (!skillOverview || !skillOverview.length) return;

  const container = document.querySelector(".skill-strip-container");
  if (!container) return;

  const detailEl = container.querySelector(".skill-strip-detail");
  const buttons = Array.from(
    container.querySelectorAll(".skill-strip-item")
  );

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-skill-id");
      buttons.forEach((b) => b.classList.toggle("selected", b === btn));

      const info = skillOverview.find((s) => s.id === id);
      if (info && detailEl) {
        detailEl.innerHTML = buildSkillStripDetail(info);
      }
    });
  });
}


  attachNavigationHandlers();
  attachSkillStripHandlers(skillOverview);
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

    // Data Settings: cycle XP view mode (days/weeks/months/years)
  const btnXpMode = document.getElementById("btn-xp-mode");
  if (btnXpMode) {
    btnXpMode.addEventListener("click", () => {
      const user = getUser();
      if (!user) return;

      const modes = ["days", "weeks", "months", "years"];
      const current =
        (user.settings && user.settings.xp_view_mode) || "days";
      const idx = modes.indexOf(current);
      const next = modes[(idx + 1) % modes.length];

      const newSettings = {
        ...(user.settings || {}),
        xp_view_mode: next,
      };
      const updatedUser = { ...user, settings: newSettings };

      setUser(updatedUser);
      saveUser(updatedUser);

      // Re-render dashboard with new mode
      renderDashboard();
    });
  }

}
