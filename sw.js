const CACHE_VERSION = 'traxo-v2';

// Paths are relative to this file's own location, so this works
// regardless of the exact case of the repo/folder name in the URL.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for the app HTML (so updates aren't stuck behind cache),
// cache-first for everything else (icons, manifest, static assets)
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
    })
  );
});
