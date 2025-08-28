/* Fun Bible Wordle - Service Worker */
const CACHE_NAME = 'fbw-precache-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.ico',
  './favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  if (isNavigationRequest(req)) {
    // Network-first for HTML navigations
    event.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return resp;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // For other GET requests, try cache-first then network
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then((resp) => {
        if (resp) return resp;
        return fetch(req).then((net) => {
          const copy = net.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return net;
        }).catch(() => caches.match('./favicon.png'));
      })
    );
  }
});
