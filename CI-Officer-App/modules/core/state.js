// modules/core/state.js
// Central in-memory state for the Prime Officer / CI Career Engine.
// No DOM, no localStorage here – pure state container.

// =========================
// AppState shape (v1.0)
// =========================
//
// AppState = {
//   user: User | null,
//   skillTree: SkillNode[],
//   cards: Card[],
//   phases: Phase[],
//   reflections: ReflectionEntry[],
//   currentScreen: string,         // e.g. "dashboard", "skill_tree", ...
//   todaysMissions: string[],      // array of Card.id
// }

// Internal mutable state object.
// Other modules should only touch it via the exported functions below.
const AppState = {
  user: null,
  skillTree: [],
  cards: [],
  phases: [],
  reflections: [],
  currentScreen: "dashboard",
  todaysMissions: [],
};

// =========================
// Initialization
// =========================

/**
 * Initialize the AppState once at app startup.
 * Typically called from app.js after loading JSON data and user profile.
 *
 * @param {Object} params
 * @param {User} params.user
 * @param {SkillNode[]} params.skillTree
 * @param {Card[]} params.cards
 * @param {Phase[]} params.phases
 * @param {ReflectionEntry[]} [params.reflections]
 */
export function initState({
  user,
  skillTree,
  cards,
  phases,
  reflections = [],
}) {
  AppState.user = user;
  AppState.skillTree = skillTree;
  AppState.cards = cards;
  AppState.phases = phases;
  AppState.reflections = reflections;
  AppState.currentScreen = "dashboard";
  AppState.todaysMissions = [];
}

/**
 * Get a snapshot of the current AppState.
 * Returns a shallow clone so outside code doesn't accidentally overwrite
 * the internal object.
 */
export function getState() {
  return { ...AppState };
}

// =========================
// Screen management
// =========================

/**
 * Set the currently active screen.
 * @param {string} screenId e.g. "dashboard", "missions", "skill_tree"
 */
export function setCurrentScreen(screenId) {
  AppState.currentScreen = screenId;
}

/**
 * Get the currently active screen id.
 * @returns {string}
 */
export function getCurrentScreen() {
  return AppState.currentScreen;
}

// =========================
// User & XP helpers
// =========================

/**
 * Replace the current user object.
 * Intended to be called by storage or XP/logic engines after updates.
 * @param {User} user
 */
export function setUser(user) {
  AppState.user = user;
}

/**
 * Get the current user object.
 * @returns {User | null}
 */
export function getUser() {
  return AppState.user;
}

/**
 * Apply a transformation function to the user and update in place.
 * @param {(user: User) => User} updater
 */
export function updateUser(updater) {
  if (!AppState.user) return;
  AppState.user = updater(AppState.user);
}

// =========================
// Missions (today's cards)
// =========================

/**
 * Set today's missions (by card id).
 * Typically called by the card_selector logic module.
 * @param {string[]} cardIds
 */
export function setTodaysMissions(cardIds) {
  AppState.todaysMissions = cardIds;
}

/**
 * Get today's missions (array of Card.id).
 * @returns {string[]}
 */
export function getTodaysMissions() {
  return AppState.todaysMissions;
}

// =========================
// Reflections
// =========================

/**
 * Replace the full reflections list.
 * @param {ReflectionEntry[]} reflections
 */
export function setReflections(reflections) {
  AppState.reflections = reflections;
}

/**
 * Append a single reflection entry.
 * @param {ReflectionEntry} entry
 */
export function addReflection(entry) {
  AppState.reflections.push(entry);
}

/**
 * Get all reflection entries.
 * @returns {ReflectionEntry[]}
 */
export function getReflections() {
  return AppState.reflections;
}

// =========================
// Data access helpers
// =========================

/**
 * Get all cards.
 * @returns {Card[]}
 */
export function getCards() {
  return AppState.cards;
}

/**
 * Get a card by id.
 * @param {string} cardId
 * @returns {Card | undefined}
 */
export function getCardById(cardId) {
  return AppState.cards.find(c => c.id === cardId);
}

/**
 * Get the full skill tree array.
 * @returns {SkillNode[]}
 */
export function getSkillTree() {
  return AppState.skillTree;
}

/**
 * Get all phases.
 * @returns {Phase[]}
 */
export function getPhases() {
  return AppState.phases;
}
