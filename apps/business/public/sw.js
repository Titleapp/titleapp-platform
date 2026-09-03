// SOCIII Service Worker — network-first strategy.
// Replaces the 47.9 tombstone. Key safety rules:
//   - Navigation requests (HTML): always network-first; stale shell never gets stuck.
//   - Hashed assets (JS/CSS): cache-first after first fetch (filename includes hash, so cache is always fresh).
//   - No client.navigate() or location.reload() calls — that was the 47.9 reload loop root cause.
//   - On activate: claim all clients so existing tabs pick up immediately.

const CACHE_VERSION = "sociii-v2";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const AVIATION_CACHE = `${CACHE_VERSION}-aviation-data`;

// Hashed asset pattern — Vite outputs files like index-Abc123.js, chunk-Xyz.css.
const HASHED_ASSET_RE = /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|png|svg|jpg|webp)(\?.*)?$/;

// EFB offline data — requests proxied through the Cloudflare Frontdoor as
// GET /api?path=/v1/... (see AviationWorkerCanvas.jsx's apiGet). Frontdoor
// is a different origin than the app itself, so this can't ride the
// same-origin asset cache above — it needs its own cross-origin branch.
// Network-first (a pilot should get fresh NOTAMs/weather when online),
// cache-fallback (so the same data is still there with zero signal in
// flight). Scoped to a specific route allowlist — never cache write
// endpoints or anything not needed preflight/in-flight.
const FRONTDOOR_HOST = "titleapp-frontdoor.titleapp-core.workers.dev";
const AVIATION_PATH_RE = /^\/v1\/(aviation:(weather|notams|tfr|airspace|airports|waypoints|navaids)|mx:listAircraft|pilot:currency|logbook:list)(\?|$)/;

function isCacheableAviationRequest(url) {
  if (url.hostname !== FRONTDOOR_HOST) return false;
  if (url.pathname !== "/api") return false;
  const path = url.searchParams.get("path") || "";
  return AVIATION_PATH_RE.test(path);
}

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== ASSET_CACHE && k !== AVIATION_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET everywhere (writes must always hit the network).
  if (request.method !== "GET") return;

  // EFB offline data — cross-origin (Frontdoor), handled before the
  // same-origin gate below. Network-first, cache-fallback: an in-flight
  // pilot with no signal gets the last-fetched weather/NOTAM/AD data
  // instead of nothing.
  if (isCacheableAviationRequest(url)) {
    e.respondWith(
      caches.open(AVIATION_CACHE).then((cache) =>
        fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() =>
            cache.match(request).then((cached) => {
              if (cached) {
                const headers = new Headers(cached.headers);
                headers.set("X-SOCIII-Cache", "stale-offline-fallback");
                return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
              }
              throw new Error("offline, no cached data for " + url.searchParams.get("path"));
            })
          )
      )
    );
    return;
  }

  // Only handle same-origin requests below this point.
  if (url.origin !== self.location.origin) return;

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
