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

// Handle incoming push notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    var payload = event.data.json();
    var title = payload.title || "Sales System";
    var options = {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-72x72.png",
      data: payload.data || { url: "/" },
      vibrate: [100, 50, 100],
      tag: payload.tag || "default",
      renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback for plain text payloads
    event.waitUntil(
      self.registration.showNotification("Sales System", {
        body: event.data.text(),
        icon: "/icons/icon-192x192.png",
      })
    );
  }
});

// Handle notification click — open or focus the app
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var targetUrl = "/";
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // If a window is already open, focus it and navigate
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Otherwise, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
