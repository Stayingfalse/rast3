const CACHE_NAME = 'raosanta-v1';
const STATIC_CACHE_URLS = [
  '/',
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

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', /** @param {any} event */ (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it can only be consumed once
            const responseToCache = response.clone();

            // Cache successful responses for static assets
            if (event.request.url.includes('/static/') || 
                event.request.url.includes('.png') || 
                event.request.url.includes('.svg') ||
                event.request.url.includes('.ico')) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // Could return a fallback page here
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
