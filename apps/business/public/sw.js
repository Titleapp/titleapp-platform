// SOCIII Service Worker — network-first strategy.
// Replaces the 47.9 tombstone. Key safety rules:
//   - Navigation requests (HTML): always network-first; stale shell never gets stuck.
//   - Hashed assets (JS/CSS): cache-first after first fetch (filename includes hash, so cache is always fresh).
//   - No client.navigate() or location.reload() calls — that was the 47.9 reload loop root cause.
//   - On activate: claim all clients so existing tabs pick up immediately.

const CACHE_VERSION = "sociii-v2";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

// Hashed asset pattern — Vite outputs files like index-Abc123.js, chunk-Xyz.css.
const HASHED_ASSET_RE = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|jpg|webp)(\?.*)?$/;

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Skip non-GET.
  if (request.method !== "GET") return;

  // Hashed assets: cache-first (filename IS the cache key — safe forever).
  if (HASHED_ASSET_RE.test(url.pathname)) {
    e.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Everything else (navigation, API calls that happen to be same-origin): network-first.
  // On failure, attempt cache fallback (navigation only). No reload, no redirect.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html")
      )
    );
    return;
  }

  // All other same-origin requests: pass through to network.
});
