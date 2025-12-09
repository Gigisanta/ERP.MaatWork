/**
 * In-memory cache for access scope with TTL
 *
 * AI_DECISION: Simple in-memory cache for development, consider Redis for production
 * Justificación: getUserAccessScope se llama frecuentemente pero cambia raramente (solo cuando cambia team membership)
 * Impacto: Reduce queries redundantes a DB, mejora performance de endpoints que verifican acceso
 */

import type { AccessScope } from './authorization';

interface CacheEntry {
  scope: AccessScope;
  expiresAt: number;
}

export const cache = new Map<string, CacheEntry>();

// TTL: 5 minutes (300000 ms)
const TTL_MS = 5 * 60 * 1000;

/**
 * Get cached access scope or return null if not cached or expired
 */
export function getCachedAccessScope(userId: string, role: string): AccessScope | null {
  const key = `${userId}:${role}`;
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    // Expired, remove from cache
    cache.delete(key);
    return null;
  }

  return entry.scope;
}

/**
 * Cache access scope with TTL
 */
export function setCachedAccessScope(userId: string, role: string, scope: AccessScope): void {
  const key = `${userId}:${role}`;
  cache.set(key, {
    scope,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Invalidate cached access scope for a user
 * Call this when team membership changes
 */
export function invalidateAccessScope(userId: string, role?: string): void {
  if (role) {
    // Invalidate specific role
    const key = `${userId}:${role}`;
    cache.delete(key);
  } else {
    // Invalidate all roles for this user
    for (const key of cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        cache.delete(key);
      }
    }
  }
}

// Cache se limpia por entry o TTL; funciones de depuración removidas por no usarse
