/**
 * Service Worker for offline caching
 *
 * AI_DECISION: Implement service worker for offline asset caching
 * Justificación: Service workers improve UX with offline support and faster asset loading
 * Impacto: Better perceived performance, offline functionality, reduced server load
 */

const CACHE_NAME = 'cactus-crm-v1';
// AI_DECISION: Solo cachear archivos estáticos que no requieren autenticación
// Justificación: Las rutas protegidas (como /) pueden redirigir a /login,
//                causando que cache.addAll() falle
// Impacto: Service Worker se instala correctamente sin errores
const STATIC_ASSETS = ['/favicon.ico', '/manifest.json'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // Usar Promise.allSettled para que un fallo no rompa todo
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            fetch(url)
              .then((response) => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn(`[SW] Skipping cache for ${url}: ${response.status}`);
              })
              .catch((err) => {
                console.warn(`[SW] Failed to cache ${url}:`, err);
              })
          )
        );
      })
      .then(() => {
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        );
      })
      .then(() => {
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // AI_DECISION: Solo manejar requests HTTP/HTTPS
  // Justificación: chrome-extension:// y otros protocolos no pueden ser cacheados
  // Impacto: Evita errores de "Request scheme 'chrome-extension' is unsupported"
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API requests (use network only)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip external resources (CDNs, analytics, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Cache First strategy for static assets
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // Network First strategy for pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page if available
          return caches.match('/');
        });
      })
  );
});
