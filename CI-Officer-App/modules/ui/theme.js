// modules/ui/theme.js
// Handles applying the current theme (dark / light) via data-theme on <body>.

/**
 * Apply a theme string to the document body.
 * @param {"dark" | "light"} theme
 */
export function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = normalized;
}

/**
 * Initialize theme from a user object (if possible).
 * @param {User | null | undefined} user
 */
export function initTheme(user) {
  const theme = user?.settings?.theme || "dark";
  applyTheme(theme);
}
