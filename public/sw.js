// Self-destructing service worker — clears all caches and unregisters itself.
// This replaces the old next-pwa service worker that was blocking updates.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", async () => {
  // Delete all caches
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  // Unregister this service worker
  const reg = await self.registration;
  await reg.unregister();
  // Force all tabs to reload with fresh content
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.navigate(client.url));
});
