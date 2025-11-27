// sw.js
// Simple service worker for Prime Officer PWA.

const CACHE_NAME = "prime-officer-cache-v1";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",

  // Data
  "./data/cards.json",
  "./data/phases.json",
  "./data/reflections.json",
  "./data/skill_tree.json",
  "./data/user_template.json",

  // Core modules
  "./modules/core/state.js",
  "./modules/core/router.js",
  "./modules/core/storage.js",

  // Logic
  "./modules/logic/card_selector.js",
  "./modules/logic/xp_engine.js",
  "./modules/logic/skill_tree_engine.js",
  "./modules/logic/timeline_engine.js",
  "./modules/logic/reflection_engine.js",
  "./modules/logic/streaks_engine.js",
  "./modules/logic/tags_engine.js",
  "./modules/logic/officer_engine.js",

  // UI
  "./modules/ui/dashboard_view.js",
  "./modules/ui/missions_view.js",
  "./modules/ui/skill_tree_view.js",
  "./modules/ui/timeline_view.js",
  "./modules/ui/reflection_view.js",
  "./modules/ui/settings_view.js",
  "./modules/ui/officer_view.js",
  "./modules/ui/theme.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Network falling back to cache (simple strategy)
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache a copy of the response
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(request);
      })
  );
});
