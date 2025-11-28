// modules/logic/card_selector.js
// Selects today's missions from the card pool.
// New version: "balanced mixer" – tries to pick
//   1 OSINT, 1 academic, 1 physical,
// then fills remaining slots with random cards.

function includesTag(card, tag) {
  const tags = (card.tags || []).map((t) => String(t).toLowerCase());
  return tags.includes(tag.toLowerCase());
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickOneFrom(pool, chosen) {
  const available = pool.filter((c) => !chosen.includes(c));
  if (!available.length) return;
  const idx = Math.floor(Math.random() * available.length);
  chosen.push(available[idx]);
}

/**
 * Main mission selector.
 *
 * @param {User} user
 * @param {Array<Card>} cards
 * @param {Object} options
 *  - dailyCount?: override number of missions
 *
 * @returns {string[]} card ids
 */
export function selectDailyCardIds(user, cards, options = {}) {
  if (!Array.isArray(cards) || !cards.length) return [];

  const desiredCount =
    options.dailyCount ??
    (user && user.settings && user.settings.daily_card_count) ??
    3;

  const dailyCount = Math.max(1, Number(desiredCount) || 3);

  // Basic pool – you can add additional filters here later
  const pool = cards.filter((c) => !c.disabled);

  if (!pool.length) return [];

  // ---- BALANCED BUCKETS ----
  // We assume:
  //   - OSINT missions: tag "osint"
  //   - Academic missions: domain === "academic"
  //   - Physical missions: domain === "physical"

  const osintCards = pool.filter((c) => includesTag(c, "osint"));
  const academicCards = pool.filter((c) => c.domain === "academic");
  const physicalCards = pool.filter((c) => c.domain === "physical");

  const chosen = [];

  // 1) Try to get 1 OSINT
  pickOneFrom(osintCards, chosen);

  // 2) 1 academic
  pickOneFrom(academicCards, chosen);

  // 3) 1 physical
  pickOneFrom(physicalCards, chosen);

  // 4) Fill remaining slots from everything else,
  //    excluding what we already picked.
  const remainingSlots = Math.max(0, dailyCount - chosen.length);
  if (remainingSlots > 0) {
    const remainingPool = shuffle(
      pool.filter((c) => !chosen.includes(c))
    );

    for (let i = 0; i < remainingSlots && i < remainingPool.length; i++) {
      chosen.push(remainingPool[i]);
    }
  }

  // Return ids only
  return chosen.map((c) => c.id);
}
