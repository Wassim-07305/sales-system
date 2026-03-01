// Cleanup service worker — replaces old next-pwa Workbox SW.
// Clears all caches, claims all clients, and forces network requests.
// The HTML cleanup script in layout.tsx handles the final unregister.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () {
        return self.clients.claim();
      })
      .then(function () {
        return self.clients.matchAll({ type: "window" });
      })
      .then(function (windowClients) {
        windowClients.forEach(function (client) {
          try {
            client.navigate(client.url);
          } catch (e) {
            // Safari standalone may not support navigate
          }
        });
      })
  );
});

// Pass ALL requests to network — no caching whatsoever
self.addEventListener("fetch", function (event) {
  event.respondWith(fetch(event.request));
});
