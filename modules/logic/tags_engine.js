// modules/logic/tags_engine.js
// Tag extraction and filtering logic.

/**
 * Extract a sorted list of unique tags from the given cards.
 * @param {Array<Card>} cards
 * @returns {string[]}
 */
export function extractTagsFromCards(cards) {
  const set = new Set();
  for (const card of cards || []) {
    if (Array.isArray(card.tags)) {
      for (const t of card.tags) {
        if (t && typeof t === "string") {
          set.add(t.toLowerCase());
        }
      }
    }
  }
  return Array.from(set).sort();
}

/**
 * Check if a card matches a given filter.
 *
 * filter "all" or empty → always true.
 * Otherwise: matches if domain == filter OR tags include filter.
 *
 * @param {Card} card
 * @param {string} filter
 * @returns {boolean}
 */
export function cardMatchesFilter(card, filter) {
  if (!filter || filter === "all") return true;

  const f = filter.toLowerCase();
  const domain = (card.domain || "").toLowerCase();

  if (domain === f) return true;

  if (Array.isArray(card.tags)) {
    return card.tags.some((t) => (t || "").toLowerCase() === f);
  }

  return false;
}
