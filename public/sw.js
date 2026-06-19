// Simple offline cache for Ví Thẻ. Cache-first for the app shell, network-first
// for navigations so updates show when online but the app still opens offline.
const CACHE = "vicard-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Navigations: try network, fall back to cached shell (offline).
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))));
    return;
  }
  // Static assets: cache-first, then network (and cache it).
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
