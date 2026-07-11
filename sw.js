const CACHE_NAME = "on369";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch
self.addEventListener("fetch", (event) => {

  // Only handle GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(

    caches.match(event.request).then((cachedResponse) => {

      // Fetch latest version in background
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {

          // Ignore bad responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const copy = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, copy));
          }

          return networkResponse;

        })
        .catch(() => {
          // Offline
        });

      // Return cache immediately if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise wait for network
      return networkFetch.then(response => {

        if (response) return response;

        // Offline fallback
        if (event.request.mode === "navigate") {
          return caches.match("/index.html");
        }

      });

    })

  );

});