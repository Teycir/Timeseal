// Service worker uninstaller - removes all caches and unregisters itself.
//
// NOTE: Do NOT call client.navigate() here. After self.registration.unregister()
// resolves, the browser may still process a pending page navigation within the
// same activation cycle. Because install() calls skipWaiting(), the browser can
// re-install and re-activate the same sw.js on the next load, creating an
// infinite reload loop (visible as rapid UI appear/disappear flickering).
//
// The SW simply cleans up caches and removes itself. The usePWA() hook on the
// client-side also calls registration.unregister() as a second safety net.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
      .then(() => self.registration.unregister())
  );
});
