// app.js — minimal working bootstrap with missions generation

import {
  initState,
  getState,
  getUser,
  getCards,
  setTodaysMissions,
} from "./modules/core/state.js";
import {
  loadInitialStaticData,
  loadUser,
} from "./modules/core/storage.js";
import {
  initRouter,
  onScreenChange,
} from "./modules/core/router.js";

import { selectDailyCardIds } from "./modules/logic/card_selector.js";

import { renderDashboard } from "./modules/ui/dashboard_view.js";
import { renderMissionsView } from "./modules/ui/missions_view.js";
import { renderSkillTreeView } from "./modules/ui/skill_tree_view.js";
import { renderTimelineView } from "./modules/ui/timeline_view.js";
import { renderSettingsView } from "./modules/ui/settings_view.js";
import { renderReflectionView } from "./modules/ui/reflection_view.js";
import { initTheme } from "./modules/ui/theme.js";
import { renderOfficerView } from "./modules/ui/officer_view.js";
import { renderWorkoutsView } from "./modules/ui/workouts_view.js";



async function bootstrap() {
  console.log("%c[BOOTSTRAP] Starting app...", "color: cyan;");

  try {
    // 1) Load static JSON data and user profile
    const staticDataPromise = loadInitialStaticData();
    const userPromise = loadUser();

    const [staticData, user] = await Promise.all([
      staticDataPromise,
      userPromise,
    ]);

    console.log("[BOOTSTRAP] Static data loaded:", staticData);
    console.log("[BOOTSTRAP] User loaded:", user);

    initTheme(user);

    // 2) Initialize app state
    initState({
      user,
      skillTree: staticData.skillTree,
      cards: staticData.cards,
      phases: staticData.phases,
      reflections: staticData.reflections,
    });

    // 3) Generate today's missions once at startup
    const userNow = getUser();
    const cardsNow = getCards();
    const todaysIds = selectDailyCardIds(userNow, cardsNow, {});
    setTodaysMissions(todaysIds);

    console.log("[BOOTSTRAP] State initialized:", getState());

    // 4) Set up router → render based on screen
onScreenChange((screenId) => {
  switch (screenId) {

    case "dashboard":
      renderDashboard();
      break;
    case "workouts":
      renderWorkoutsView();
      break;
    case "missions":
      renderMissionsView();
      break;
    case "skill_tree":
      renderSkillTreeView();
      break;
      case "timeline":
      renderTimelineView();
      break;
      case "reflection":
      renderReflectionView();
      break;
      case "settings":
      renderSettingsView();
      break;
      case "officer":
      renderOfficerView();
      break;
    default:
      renderDashboard();
      console.warn("No view implemented for screen:", screenId);
  }
});


    // 5) Initialize the router (reads URL hash, triggers first render)
    initRouter();
  } catch (err) {
    console.error("[BOOTSTRAP] Error:", err);
    document.getElementById("app").innerHTML =
      "<h2>Error loading app</h2><pre>" + err.toString() + "</pre>";
  }
}

bootstrap();

// ==============
// PWA: Service worker registration
// ==============
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        console.log("[PWA] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.error("[PWA] Service worker registration failed:", err);
      });
  });
}

