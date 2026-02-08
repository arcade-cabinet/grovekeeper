const CACHE_VERSION = 5;
const CACHE_NAME = `grovekeeper-v${CACHE_VERSION}`;

// Derive the base path from the service worker's own URL
// e.g. https://user.github.io/grovekeeper/sw.js → /grovekeeper/
const SW_SCOPE = new URL(".", self.location).pathname;
const PRECACHE_URLS = [SW_SCOPE, SW_SCOPE + "index.html", SW_SCOPE + "sql-wasm/sql-wasm.wasm"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Navigation requests: network-first with cache fallback.
  // Always try to get fresh HTML so that hashed asset references are current.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(SW_SCOPE + "index.html")))
    );
    return;
  }

  // Hashed assets (JS/CSS/WASM): cache-first since hashed filenames are immutable.
  // If a cached response turns out stale (server returns 404), purge it and
  // let the browser handle the error so the error boundary can offer a reload.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
