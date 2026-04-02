// TitleApp Service Worker — 44.5 Cache Fix
// Pass-through SW: no offline caching. Handles update lifecycle only.
// skipWaiting + clients.claim = new deploys activate immediately.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    // Purge ALL old caches left by previous service workers
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() =>
      clients.claim()
    ).then(() => {
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// Listen for SKIP_WAITING message from app
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Pass-through fetch — no caching, just forward to network
self.addEventListener('fetch', (e) => {
  // Let the browser handle all requests normally
  return;
});
