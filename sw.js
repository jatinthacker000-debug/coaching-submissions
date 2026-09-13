const CACHE_NAME = "padh-rahi-cache-v2";
const urlsToCache = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/styles.css",
  "/api-client.js",
  "/submit.js",
  "/dashboard.js",
  "/logo.jpg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  // Only cache GET requests, bypass APIs
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => { if (key !== CACHE_NAME) { return caches.delete(key); } })))); });
