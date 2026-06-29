// SOCIII Service Worker — S52.44 SELF-RETIRING.
// Service workers are DISABLED platform-wide (see main.jsx). A stale SW left
// registered on a device (pre-44.5 aggressive-cache era) can serve a broken
// cached shell — symptom: blank white screen on mobile, stale bundle on desktop.
// This script exists ONLY to retire any such SW: on activate it purges all
// caches and unregisters itself, so the next load is clean (no SW, fresh from
// network). No fetch caching and NO client.navigate()/reload — that avoids the
// 47.9 "infinite reload loop on mobile" class of bug entirely.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* no caches */ }
    try {
      await self.registration.unregister();
    } catch { /* already gone */ }
    // Tell any live tab the SW retired; the app may refresh on its own terms.
    try {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((c) => c.postMessage({ type: 'SW_RETIRED' }));
    } catch { /* no clients */ }
  })());
});

// Pass-through — never cache.
self.addEventListener('fetch', () => { /* let the network handle everything */ });
