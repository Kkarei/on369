const CACHE_NAME = "on369-v30";   // bump with each release so old files are dropped

const APP_SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Install: pre-cache the shell. A single missing file must not abort the whole install.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(APP_SHELL.map(url => cache.add(url).catch(() => {})))
    )
  );
});

// Activate: remove caches from earlier releases, then take control of open tabs.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network first, cache as the offline fallback. Network-first means a new
// release shows up on the next load instead of one load later (the old
// stale-while-revalidate behaviour served the previous version first).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // third-party icons, APIs: let the browser handle them
  if (req.headers.has("range")) return;                // video wallpaper streaming needs real range responses
  const isMedia = /\/wallpapers\//.test(url.pathname); // large images/videos: don't fill the cache with them

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic" && !isMedia) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === "navigate") return caches.match("index.html").then(r => r || Response.error());
          return Response.error();
        })
      )
  );
});
