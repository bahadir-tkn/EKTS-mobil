// EKTS Mobil service worker: lets the installed app open and run offline.
// Pages are fetched network-first (so updates arrive when online) and fall back
// to the cache; static files are served from the cache and refreshed in the background.
// The build replaces these two lines with a version and the list of every
// file in the site (app, example circuits, help pages, icons), so each
// deploy installs a fresh worker, everything works offline after the first
// visit, and the old version's cache is dropped.
const CACHE = 'ekts-mobil-dev';
const PRECACHE = ['./', './index.html'];

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(PRECACHE);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const cacheable =
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
  if (!cacheable) return;

  if (req.mode === 'navigate') {
    // The app itself and the help pages: network first, cache when offline.
    const scope = new URL('./', self.location.href).pathname;
    const isApp = url.pathname === scope || url.pathname === scope + 'index.html';
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(isApp ? './index.html' : req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(isApp ? './index.html' : req, { ignoreVary: true })) || caches.match('./index.html', { ignoreVary: true })),
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
