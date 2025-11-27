// modules/logic/card_selector.js
// Logic for selecting today's mission cards.
// Pure functions only: no DOM, no storage, no global state access.

/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} domain
 * @property {number} estimated_time
 * @property {number} xp_reward
 * @property {string[]} linked_skill_nodes
 * @property {"easy" | "medium" | "hard"} difficulty
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {Object.<string, number>} xp_by_domain
 * @property {Object} settings
 * @property {number} [settings.daily_card_count]
 */

/**
 * Options for selection.
 * @typedef {Object} SelectionOptions
 * @property {string} [date]       // "YYYY-MM-DD" (not currently used in logic, but reserved)
 * @property {number} [count]      // override for how many cards to select
 */

/**
 * Entry point:
 * Select today's missions as an array of Card.id.
 *
 * Strategy v1:
 * - Determine desired count (from options or user.settings.daily_card_count or fallback 5)
 * - Compute domain weights (weaker XP = higher weight)
 * - Randomly pick cards, weighted by domain weakness
 * - Avoid duplicates
 *
 * @param {User} user
 * @param {Card[]} cards
 * @param {SelectionOptions} [options]
 * @returns {string[]} array of Card.id
 */
export function selectDailyCardIds(user, cards, options = {}) {
  const count =
    options.count ??
    (user.settings && typeof user.settings.daily_card_count === "number"
      ? user.settings.daily_card_count
      : 5);

  if (!cards || cards.length === 0) {
    return [];
  }

  const domainWeights = computeDomainWeights(user, cards);

  const selectedIds = [];
  const usedCardIds = new Set();

  let safetyCounter = 0;
  const maxIterations = cards.length * 5; // avoid infinite loops

  while (selectedIds.length < count && safetyCounter < maxIterations) {
    safetyCounter++;

    const card = pickRandomCardWeightedByDomain(cards, domainWeights);
    if (!card) break;

    if (usedCardIds.has(card.id)) continue;

    selectedIds.push(card.id);
    usedCardIds.add(card.id);
  }

  return selectedIds;
}

// ================================
// Helper: compute domain weights
// ================================

/**
 * Compute a weight for each domain based on user's XP.
 * Lower XP -> higher weight -> more likely to be selected.
 *
 * @param {User} user
 * @param {Card[]} cards
 * @returns {Object.<string, number>} key: domain, value: weight
 */
function computeDomainWeights(user, cards) {
  const xp = user.xp_by_domain || {};

  // Collect domains present in the cards list
  const domainsInCards = new Set(cards.map((c) => c.domain));

  // Determine raw values: we use (maxXP - currentXP + base) to invert priority
  let maxXp = 0;
  for (const domain of domainsInCards) {
    const value = xp[domain] ?? 0;
    if (value > maxXp) maxXp = value;
  }

  const base = 10; // prevents zero weights
  const weights = {};

  for (const domain of domainsInCards) {
    const domainXp = xp[domain] ?? 0;
    const raw = maxXp - domainXp + base;
    weights[domain] = raw > 0 ? raw : base;
  }

  return weights;
}

// ======================================
// Helper: weighted random card selection
// ======================================

/**
 * Pick one random card, weighted by domain weakness.
 *
 * @param {Card[]} cards
 * @param {Object.<string, number>} domainWeights
 * @returns {Card | null}
 */
function pickRandomCardWeightedByDomain(cards, domainWeights) {
  if (!cards.length) return null;

  // Compute total weight across all cards
  let totalWeight = 0;
  const cardWeights = [];

  for (const card of cards) {
    const domainWeight = domainWeights[card.domain] ?? 1;
    const weight = domainWeight;
    cardWeights.push({ card, weight });
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    // fallback: uniform random
    const idx = Math.floor(Math.random() * cards.length);
    return cards[idx];
  }

  let r = Math.random() * totalWeight;

  for (const entry of cardWeights) {
    if (r < entry.weight) {
      return entry.card;
    }
    r -= entry.weight;
  }

  // fallback
  return cardWeights[cardWeights.length - 1].card;
}
