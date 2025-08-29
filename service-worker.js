const CACHE_NAME = 'billetto-stats-v4';
// VITE_BASE_PATH is now dynamic
const path = self.location.pathname;
const VITE_BASE_PATH = path.substring(0, path.lastIndexOf('/')); // e.g., '/app' or '' for root

const urlsToCache = [
  `${VITE_BASE_PATH}/`,
  `${VITE_BASE_PATH}/index.html`,
  `${VITE_BASE_PATH}/manifest.json`,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Always go to network for the proxy.
  if (event.request.url.includes('yogamela.org')) {
    return event.respondWith(fetch(event.request));
  }
  
  // Stale-while-revalidate for everything else
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {
          // If fetch fails (e.g., offline), return the cached response if it exists
          if (cachedResponse) {
            return cachedResponse;
          }
          console.warn('ServiceWorker: fetch failed and no cache hit for', event.request.url, err);
      });
      // Return cached response immediately if available, and fetch in background
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});