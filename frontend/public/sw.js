// Flavour Base India - Service Worker
const CACHE_NAME = 'flavour-pwa-v1';

const STATIC_PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon-180.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png'
];

// Install: pre-cache critical shell icons and manifest
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('Pre-caching partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch routing
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1. Never intercept non-GET requests (e.g. POST, PUT, DELETE)
  if (req.method !== 'GET') {
    return;
  }

  const url = new URL(req.url);

  // 2. Never cache API calls, SSE streams, or dynamic backend uploads
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  // 3. HTML Navigation: Network-First strategy so website updates show up immediately
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(req).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 4. Static assets (JS, CSS, icons, images, fonts): Cache-First / Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(js|mjs|css|png|jpg|jpeg|svg|webp|woff|woff2|ttf|ico)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const isJs = /\.(m?js)$/i.test(url.pathname);

        // Sanity check: If a cached response for a JS file is accidentally HTML, purge it immediately
        if (cachedResponse && isJs) {
          const ct = cachedResponse.headers.get('content-type') || '';
          if (ct.includes('text/html')) {
            caches.open(CACHE_NAME).then((cache) => cache.delete(req));
            cachedResponse = null;
          }
        }

        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const ct = networkResponse.headers.get('content-type') || '';
              // CRITICAL: NEVER cache an HTML response as a JS asset
              if (isJs && ct.includes('text/html')) {
                return networkResponse;
              }
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network fetch
  event.respondWith(fetch(req));
});

