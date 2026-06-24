// VisePanda v7 service worker — shell + translations cache.
// ⚠️ Bump the cache version on EVERY shell asset change. Otherwise old
//   visitors stay on the stale build until they clear site data.
const CACHE = 'vp-v7-2';
const SHELL = [
  '/', '/manifest.json', '/favicon.svg',
  '/web/assets/paper-noise.svg',
  '/web/css/tokens.css',
  '/web/css/reset.css',
  '/web/css/base.css',
  '/web/css/components.css',
  '/web/css/chat.css',
  '/web/css/dashboard.css',
  '/web/css/translate.css',
  '/web/css/auth.css',
  '/web/js/app.js',
  '/web/js/api.js',
  '/web/js/chat.js',
  '/web/js/dashboard.js',
  '/web/js/translate.js',
  '/web/js/voice.js',
  '/web/js/auth.js',
  '/web/js/itinerary.js',
  '/web/js/favorites.js',
  '/web/js/components/chop.js',
  '/web/js/components/bilingual-term.js',
  '/web/js/components/card.js',
];
const TRANSLATIONS = [
  '/api/translations/phrases',
  '/api/translations/attractions',
  '/api/translations/culture',
  '/api/translations/dining',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([...SHELL, ...TRANSLATIONS]).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Same-origin only.
  if (url.origin !== self.location.origin) return;
  // Cache-first for known shell + translations.
  if (SHELL.includes(url.pathname) || TRANSLATIONS.includes(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ||
          fetch(e.request).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            return resp;
          })
      )
    );
    return;
  }
  // Network-only for everything else (esp. /api/*).
});
