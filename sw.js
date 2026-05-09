const CACHE = 'dt-v18';
const ASSETS = [
  './',
  './index.html',
  './cheatsheet.html',
  './feed.html',
  './rules.html',
  './signs.html',
  './exam.html',
  './app-shared.js',
  './questions.json',
  './questions_de.json',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('googleusercontent.com')) {
    e.respondWith(
      caches.match(req).then(hit => {
        const fetchPromise = fetch(req).then(res => {
          // Cache both ok responses AND opaque ones (cross-origin <img>/<video>
          // requests are no-cors and come back as type 'opaque' with status 0,
          // so res.ok is false. We still want them cached.)
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit);
        return hit || fetchPromise;
      })
    );
  }
});
