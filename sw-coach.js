// Service Worker specifically for Coach Dashboard PWA
const CACHE_NAME = "coach-portal-v1";
const STATIC_ASSETS = [
  "/dashboard.html",
  "/styles.css",
  "/dashboard.js",
  "/api-client.js",
  "/coach-manifest.json",
  "/logo.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Service worker precache partial fail:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith("coach-portal-")) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // For API calls, always go to network (live database updates)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "Offline: Network unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // For navigation requests (like reloading /dashboard.html), network first, fallback to cached dashboard.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/dashboard.html"))
    );
    return;
  }

  // For static assets, try cache first, then fetch and update cache
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Fetch fresh copy in background to update cache (stale-while-revalidate)
        fetch(event.request).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkRes));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request);
    })
  );
});
