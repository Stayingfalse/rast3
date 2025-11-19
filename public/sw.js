const CACHE_NAME = 'raosanta-v1';
const STATIC_CACHE_URLS = [
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon.ico',
  '/header.svg',
  '/site.webmanifest'
];

// Install event - cache static assets
self.addEventListener('install', /** @param {any} event */ (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return (/** @type {any} */ (self)).skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', /** @param {any} event */ (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })      .then(() => {
        console.log('[SW] Service worker activated');
        return (/** @type {any} */ (self)).clients.claim();
      })
  );
});

// Fetch event - use network-first for navigations and API requests,
// and cache static assets only. This prevents serving stale HTML or API
// responses on soft refreshes.
self.addEventListener('fetch', /** @param {any} event */ (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isApi = requestUrl.pathname.startsWith('/api/');
  const isNavigation = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');

  // Network-first for navigation requests (HTML) to avoid stale home page HTML
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If successful, return network response (don't cache HTML)
          if (networkResponse && networkResponse.ok) {
            return networkResponse;
          }
          // Fallback to cached root if available
          return caches.match('/').then((cached) => cached || networkResponse);
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Network-only for API requests (do not cache API responses)
  if (isApi) {
    event.respondWith(
      fetch(event.request, { credentials: 'same-origin' }).catch(() => caches.match(event.request))
    );
    return;
  }

  // For static assets, serve from cache then network and cache new responses
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || !response.ok) return response;
            const responseToCache = response.clone();
            // Cache common static assets
            if (event.request.url.includes('/static/') ||
                event.request.url.endsWith('.png') ||
                event.request.url.endsWith('.svg') ||
                event.request.url.endsWith('.ico') ||
                event.request.url.endsWith('.webmanifest')) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            }
            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed for asset:', event.request.url, error);
            throw error;
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', /** @param {any} event */ (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    (/** @type {any} */ (self)).skipWaiting();
  }
});
