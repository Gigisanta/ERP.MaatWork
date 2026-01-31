'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 *
 * AI_DECISION: Register service worker only in client-side
 * Justificación: Service workers are browser APIs, must be registered in client components
 * Impacto: Enables offline caching, improves performance with cached assets
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.info({ scope: registration.scope }, 'Service Worker registered');

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, prompt user to refresh
                  logger.info('New service worker available');
                }
              });
            }
          });
        })
        .catch((error) => {
          logger.error({ error }, 'Service Worker registration failed');
        });
    }
  }, []);

  return null;
}
