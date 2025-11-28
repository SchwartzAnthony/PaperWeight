// modules/ui/missions_view.js
// Renders the Missions screen and lets you complete today's missions,
// with tag filters.

import {
  getState,
  getUser,
  setUser,
  getSkillTree,
  getCardById,
  getCards,
  setTodaysMissions,
} from "../core/state.js";
import { saveUser } from "../core/storage.js";
import { applyXpForCompletedCard } from "../logic/xp_engine.js";
import { navigateTo } from "../core/router.js";
import {
  extractTagsFromCards,
  cardMatchesFilter,
} from "../logic/tags_engine.js";
import { selectDailyCardIds } from "../logic/card_selector.js";
import {
  computeStreakStats,
  computeBonusRolls,
} from "../logic/streaks_engine.js";


/**
 * Render the Missions view.
 * @param {string} [activeFilter="all"]
 */
export function renderMissionsView(activeFilter = "all") {
  const app = document.getElementById("app");
  const state = getState();
  const user = state.user;
  const cards = state.cards;
  const missions = state.todaysMissions || [];
  const today = getTodayIsoDate();

  const completedToday =
    (user.completed_cards_by_date &&
      user.completed_cards_by_date[today]) ||
    [];

  // Streak-based rerolls
  const streakStats = computeStreakStats(user);
  const allowedRolls = computeBonusRolls(streakStats.currentStreak);
  const usedRolls =
    (user.rerolls_by_date && user.rerolls_by_date[today]) || 0;
  const remainingRolls = Math.max(0, allowedRolls - usedRolls);

  // Resolve mission IDs → card objects
  const missionCards = missions
    .map((id) => cards.find((c) => c.id === id) || getCardById(id))
    .filter(Boolean);

  // All tags available among today's missions
  const allTags = extractTagsFromCards(missionCards);

  // Apply active filter
  const visibleCards =
    activeFilter === "all"
      ? missionCards
      : missionCards.filter((card) => cardMatchesFilter(card, activeFilter));

  app.innerHTML = `
    <div class="missions-container">
      <h1>Missions</h1>

      <!-- Reroll info -->
  <section class="missions-meta-section">
    <p>
      Bonus rolls today:
      <strong>${remainingRolls}</strong> / ${allowedRolls}
    </p>
    ${
      remainingRolls > 0
        ? `<button id="btn-reroll-missions">Reroll Missions</button>`
        : `<p class="muted">No rerolls left today. Build your streak to earn more.</p>`
    }
        </section>

      <!-- Filters -->
      <section class="missions-filters-section">
        <div class="missions-filters">
          <button
            class="filter-chip ${
              activeFilter === "all" ? "filter-chip-active" : ""
            }"
            data-filter="all"
          >
            All
          </button>
          ${allTags
            .map(
              (tag) => `
            <button
              class="filter-chip ${
                activeFilter === tag ? "filter-chip-active" : ""
              }"
              data-filter="${tag}"
            >
              ${tag}
            </button>`
            )
            .join("")}
        </div>
      </section>

      <!-- Missions list -->
      <section class="missions-list-section">
        ${
          visibleCards.length === 0
            ? `<p>No missions match this filter.</p>`
            : `
          <ul class="missions-list">
            ${visibleCards
              .map((card) => {
                const isCompleted = completedToday.includes(card.id);
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
                    <div class="mission-header">
                      <strong>${card.title}</strong>
                    </div>
                    <div class="mission-body">
                      <p>${card.description}</p>
                      <div class="mission-meta">
                        <span>Domain: ${card.domain}</span>
                        <span>XP: ${card.xp_reward}</span>
                        <span>Difficulty: ${card.difficulty}</span>
                      </div>
                      ${tagsHtml}
                      <div class="mission-actions">
                        ${
                          isCompleted
                            ? `<span class="mission-status done">Completed</span>`
                            : `<button class="mission-complete-btn" data-card-id="${card.id}">
                                 Complete
                               </button>`
                        }
                      </div>
                    </div>
                  </li>
                `;
              })
              .join("")}
          </ul>
        `}
      </section>

      <div class="missions-footer">
        <button id="btn-back-dashboard">Back to Dashboard</button>
      </div>
    </div>
  `;

  attachMissionHandlers(activeFilter);
}

/**
 * Attach event listeners for mission completion, filters, and navigation.
 */
function attachMissionHandlers(activeFilter) {
  // Reroll missions button
  const btnReroll = document.getElementById("btn-reroll-missions");
  if (btnReroll) {
    btnReroll.addEventListener("click", () => {
      handleRerollMissions(activeFilter);
    });
  }

  // Complete mission buttons
  document.querySelectorAll(".mission-complete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cardId = btn.getAttribute("data-card-id");
      if (cardId) {
        handleCompleteMission(cardId, activeFilter);
      }
    });
  });

  // Filter chips
  document.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.getAttribute("data-filter") || "all";
      // Re-render missions view with new filter
      renderMissionsView(filter);
    });
  });

  // Back navigation
  const backBtn = document.getElementById("btn-back-dashboard");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigateTo("dashboard");
    });
  }
}

function handleRerollMissions(activeFilter) {
  const user = getUser();
  const cards = getCards();
  if (!user || !cards || cards.length === 0) return;

  const today = getTodayIsoDate();

  // Re-check streak + allowances
  const streakStats = computeStreakStats(user);
  const allowed = computeBonusRolls(streakStats.currentStreak);
  const used =
    (user.rerolls_by_date && user.rerolls_by_date[today]) || 0;
  const remaining = Math.max(0, allowed - used);

  if (remaining <= 0) {
    alert("No bonus rolls left today.");
    return;
  }

  // Generate a fresh set of missions for today
  const newMissionIds = selectDailyCardIds(user, cards, {});

  // Update state.todaysMissions
  setTodaysMissions(newMissionIds);

  // Update user's reroll count
  const updatedUser = { ...user };
  if (!updatedUser.rerolls_by_date) {
    updatedUser.rerolls_by_date = {};
  }
  updatedUser.rerolls_by_date[today] = used + 1;

  setUser(updatedUser);
  saveUser(updatedUser);

  // Re-render Missions view with same filter
  renderMissionsView(activeFilter);
}

/**
 * Handle completing a single mission.
 * After update, re-render with the same active filter.
 *
 * @param {string} cardId
 * @param {string} activeFilter
 */
function handleCompleteMission(cardId, activeFilter) {
  const user = getUser();
  const card = getCardById(cardId);
  const skillTree = getSkillTree();

  if (!user || !card || !skillTree) {
    console.error("Missing user/card/skillTree in handleCompleteMission");
    return;
  }

  const updatedUser = applyXpForCompletedCard(user, card, skillTree, {
    date: getTodayIsoDate(),
  });

  setUser(updatedUser);
  saveUser(updatedUser);

  // Re-render this view so the mission shows as completed
  renderMissionsView(activeFilter);
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
