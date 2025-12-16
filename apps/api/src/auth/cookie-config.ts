/**
 * Cookie Configuration Utility
 *
 * Centralized cookie configuration for authentication to ensure consistency
 * across login, refresh, and logout operations.
 *
 * AI_DECISION: Centralizar configuración de cookies de autenticación
 * Justificación: Garantiza que login, refresh y logout usen exactamente las mismas opciones
 *                para que clearCookie funcione correctamente
 * Impacto: Fixes logout cookie clearing issues, ensures consistent cookie behavior
 */

import type { CookieOptions } from 'express';

/**
 * Get cookie options for authentication token
 *
 * These options must match exactly between setCookie and clearCookie calls
 * for cookies to be properly cleared.
 */
export function getAuthCookieOptions(maxAge?: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    // Don't set domain explicitly - let browser handle it
    // This ensures cookies work correctly in all environments
  };

  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }

  return options;
}

/**
 * Get cookie options for clearing authentication token
 *
 * Must match exactly the options used when setting the cookie.
 */
export function getAuthCookieClearOptions(): CookieOptions {
  return getAuthCookieOptions();
}
