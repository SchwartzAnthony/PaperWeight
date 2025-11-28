// modules/core/storage.js
// Handles loading static JSON data and persisting user state in localStorage.
// No DOM, no UI. Pure data I/O.

// =========================
// LocalStorage keys
// =========================

const LOCAL_STORAGE_USER_KEY = "prime_officer_user_v1";
const LOCAL_STORAGE_ARCHIVES_KEY = "prime_officer_archives_v1";


// =========================
// Generic JSON loader
// =========================

/**
 * Load a JSON file from the /data folder.
 * @param {string} fileName e.g. "skill_tree.json"
 * @returns {Promise<any>}
 */
async function loadJsonFromData(fileName) {
  const response = await fetch(`./data/${fileName}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// =========================
// Initial static data loader
// =========================

/**
 * Load all static data needed at app startup:
 * - skill tree
 * - cards
 * - phases
 * - reflections (optional, can be empty)
 *
 * @returns {Promise<{
 *   skillTree: SkillNode[],
 *   cards: Card[],
 *   phases: Phase[],
 *   reflections: ReflectionEntry[]
 * }>}
 */
export async function loadInitialStaticData() {
  const [skillTree, cards, phases, reflections] = await Promise.all([
    loadJsonFromData("skill_tree.json"),
    loadJsonFromData("cards.json"),
    loadJsonFromData("phases.json"),
    loadJsonFromData("reflections.json").catch(() => []), // tolerate missing/empty
  ]);

  return {
    skillTree,
    cards,
    phases,
    reflections: reflections || [],
  };
}

// =========================
// User save/load/reset
// =========================

/**
 * Load the user profile from localStorage, or fall back to user_template.json
 * if none is saved yet.
 *
 * @returns {Promise<User>}
 */
export async function loadUser() {
  // 1) Try localStorage first
  const raw = window.localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.warn("Failed to parse user from localStorage, falling back to template:", err);
    }
  }

  // 2) Fallback: load template from /data/user_template.json
  const templateUser = await loadJsonFromData("user_template.json");
  // Ensure created_at is set if not already
  if (!templateUser.created_at) {
    templateUser.created_at = new Date().toISOString();
  }
  // Save immediately so next load comes from localStorage
  saveUser(templateUser);
  return templateUser;
}

/**
 * Save the current user profile to localStorage.
 * @param {User} user
 */
export function saveUser(user) {
  try {
    const raw = JSON.stringify(user);
    window.localStorage.setItem(LOCAL_STORAGE_USER_KEY, raw);
  } catch (err) {
    console.error("Failed to save user to localStorage:", err);
  }
}

/**
 * Completely reset the user profile:
 * - remove from localStorage
 * - reload template from /data/user_template.json
 *
 * @returns {Promise<User>} the fresh template user
 */
export async function resetUser() {
  window.localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  const templateUser = await loadJsonFromData("user_template.json");
  if (!templateUser.created_at) {
    templateUser.created_at = new Date().toISOString();
  }
  saveUser(templateUser);
  return templateUser;
}

// =========================
// Archive save/load
// =========================

/**
 * Load all archive snapshots from localStorage.
 * Returns [] if none exist.
 */
export function loadArchives() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ARCHIVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to load archives:", err);
    return [];
  }
}

/**
 * Save archive array back to localStorage.
 * @param {Array<any>} archives
 */
export function saveArchives(archives) {
  try {
    const raw = JSON.stringify(archives || []);
    localStorage.setItem(LOCAL_STORAGE_ARCHIVES_KEY, raw);
  } catch (err) {
    console.error("Failed to save archives:", err);
  }
}
