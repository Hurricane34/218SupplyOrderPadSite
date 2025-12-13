/* 218 Supply OrderPad Service Worker
   Fixes:
   - Removes broken "..." placeholder that prevented install
   - Bumps cache version so updates actually apply
   - Precaches the real runtime assets (data.js + products_from_csv.js)
   - Uses Network-First for navigations (prevents stale/Not Found issues)
*/

const CACHE_NAME = "218-orderpad-v2";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/index_mobile.html",
  "/index_desktop.html",
  "/data.js",
  "/products_from_csv.js",
  "/products.csv",
  "/Logo.PNG",
  "/manifest.json"
];

// Install: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigation, cache-first for everything else
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigations (HTML pages): network-first
  const isNav = req.mode === "navigate" || (req.destination === "document");
  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/index.html")))
    );
    return;
  }

  // Static assets: cache-first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});
