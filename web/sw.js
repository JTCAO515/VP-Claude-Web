const CACHE = "visepanda-shell-v7.0.0";
const SHELL = [
  "/",
  "/web/css/app.css?v=7.0.0",
  "/web/js/main.js",
  "/web/js/api.js",
  "/web/js/chat.js",
  "/web/js/dashboard.js",
  "/web/js/translate.js",
  "/web/js/store.js",
  "/web/js/toast.js",
  "/web/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
