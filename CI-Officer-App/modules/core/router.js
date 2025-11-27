// modules/core/router.js
// Simple screen router for the Prime Officer app.
// - Manages which "screen" is active (dashboard, missions, etc.)
// - Syncs with URL hash (#dashboard, #missions, ...)
// - Notifies listeners (e.g., app.js) when the screen changes.

import { setCurrentScreen, getCurrentScreen } from "./state.js";

// =========================
// Valid screens
// =========================

export const SCREENS = {
  DASHBOARD: "dashboard",
  MISSIONS: "missions",
  SKILL_TREE: "skill_tree",
  TIMELINE: "timeline",
  REFLECTION: "reflection",
  SETTINGS: "settings",
  OFFICER: "officer"
};

// List of allowed screen ids for validation
const VALID_SCREENS = new Set(Object.values(SCREENS));

// =========================
// Listener handling
// =========================

// Each listener is a function: (newScreenId: string) => void
const screenChangeListeners = [];

/**
 * Subscribe to screen change events.
 * @param {(screenId: string) => void} listener
 */
export function onScreenChange(listener) {
  screenChangeListeners.push(listener);
}

/**
 * Notify all listeners that the screen has changed.
 * @param {string} screenId
 */
function notifyScreenChange(screenId) {
  for (const listener of screenChangeListeners) {
    try {
      listener(screenId);
    } catch (err) {
      console.error("Error in screen change listener:", err);
    }
  }
}

// =========================
// Navigation core
// =========================

/**
 * Navigate to a specific screen.
 * - Validates the screen id
 * - Updates AppState
 * - Syncs URL hash
 * - Notifies listeners
 *
 * @param {string} screenId
 */
export function navigateTo(screenId) {
  if (!VALID_SCREENS.has(screenId)) {
    console.warn(`router.navigateTo: invalid screen "${screenId}", falling back to dashboard.`);
    screenId = SCREENS.DASHBOARD;
  }

  const current = getCurrentScreen();
  if (current === screenId) {
    return; // no-op
  }

  setCurrentScreen(screenId);

  // Update URL hash without reloading the page
  if (window.location.hash !== `#${screenId}`) {
    window.location.hash = `#${screenId}`;
  }

  notifyScreenChange(screenId);
}

/**
 * Resolve the desired screen from the current URL hash.
 * If invalid or missing, returns the default (dashboard).
 *
 * @returns {string}
 */
function getScreenFromHash() {
  const hash = window.location.hash || "";
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (VALID_SCREENS.has(raw)) {
    return raw;
  }
  return SCREENS.DASHBOARD;
}

// =========================
// Initialization
// =========================

/**
 * Initialize the router:
 * - Reads initial screen from URL hash
 * - Sets AppState.currentScreen accordingly
 * - Attaches hashchange listener
 *
 * Call this once from app.js after state has been initialized.
 */
export function initRouter() {
  // Set initial screen based on hash
  const initialScreen = getScreenFromHash();
  setCurrentScreen(initialScreen);
  notifyScreenChange(initialScreen);

  // Listen for future hash changes (e.g., user clicks back/forward)
  window.addEventListener("hashchange", () => {
    const newScreen = getScreenFromHash();
    setCurrentScreen(newScreen);
    notifyScreenChange(newScreen);
  });
}
