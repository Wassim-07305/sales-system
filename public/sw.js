// Service Worker for Sales System — Push Notifications
// This SW handles push events, notification clicks, and basic lifecycle.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            return caches.delete(k);
          }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// Handle incoming push notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;

  var title = "Sales System";
  var options = {
    body: "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    data: { url: "/" },
    vibrate: [100, 50, 100],
    tag: "default",
    renotify: true,
  };

  try {
    var payload = event.data.json();
    title = payload.title || title;
    options.body = payload.body || options.body;
    options.icon = payload.icon || options.icon;
    options.badge = payload.badge || options.badge;
    options.data = payload.data || options.data;
    options.tag = payload.tag || options.tag;
  } catch (e) {
    // Fallback for plain text payloads
    options.body = event.data.text();
  }

  event.waitUntil(self.registration.showNotification(title, options));
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
      }),
  );
});
