// VisePanda v9 service worker — shell + translations.
const CACHE = 'vp-v9-1';
const SHELL = [
  '/', '/manifest.json', '/favicon.svg',
  '/web/assets/bg-mountains.svg',
  '/web/css/tokens.css',
  '/web/css/reset.css',
  '/web/css/base.css',
  '/web/css/sidebar.css',
  '/web/css/topbar.css',
  '/web/css/ask.css',
  '/web/css/plan.css',
  '/web/css/cities.css',
  '/web/css/tools.css',
  '/web/css/trips.css',
  '/web/css/auth.css',
  '/web/js/app.js',
  '/web/js/api.js',
  '/web/js/sidebar.js',
  '/web/js/topbar.js',
  '/web/js/ask.js',
  '/web/js/plan.js',
  '/web/js/cities.js',
  '/web/js/tools.js',
  '/web/js/trips.js',
  '/web/js/auth.js',
  '/web/js/voice.js',
  '/web/js/map.js',
  '/web/js/components/sheet.js',
  '/web/js/components/citypicker.js',
  '/web/js/components/translate-panel.js',
  '/web/js/components/booking-panel.js',
  '/web/js/ratings.js',
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
  if (url.origin !== self.location.origin) return;
  if (TRANSLATIONS.includes(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached || fetch(e.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
      )
    );
    return;
  }
  if (SHELL.includes(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request).then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});
