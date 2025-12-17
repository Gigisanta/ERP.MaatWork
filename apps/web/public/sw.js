/**
 * Service Worker - Minimal version
 *
 * AI_DECISION: Disabled caching temporarily to debug navigation issues
 * Justificación: Service Worker cache may have been causing incorrect page serving
 * Impacto: No offline caching, but navigation should work correctly
 *
 * TODO: Re-enable caching once navigation is confirmed working
 */

// Install - skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate - clear all caches to ensure fresh content
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch - do nothing, let network handle all requests
// No caching, no interception
