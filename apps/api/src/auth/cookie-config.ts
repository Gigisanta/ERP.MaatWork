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

  // AI_DECISION: Switch to standard 'lax' and host-only cookies
  // Justificación: 'SameSite=None' was causing issues with Cloudflare/Browser delivery.
  //                'Lax' is the standard for top-level navigation in single-domain apps.
  //                Removing explicit 'domain' makes it a "Host-Only" cookie, which is safer
  //                and less prone to rejection.
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction, // MUST be true in production
    sameSite: 'lax', // Standardize on Lax for stability
    path: '/',
  };

  // AI_DECISION: Comment out explicit domain to enforce Host-Only cookie
  // This avoids mismatch issues between .maat.work and maat.work
  // if (isProduction && process.env.COOKIE_DOMAIN) {
  //   options.domain = process.env.COOKIE_DOMAIN;
  // }

  if (maxAge !== undefined) {
    options.maxAge = maxAge;
  }

  return options;
}

/**
 * Get debug information about cookie options (for logging)
 *
 * AI_DECISION: Agregar helper para logging de cookies
 * Justificación: Facilita debugging de problemas de cookies en producción
 * Impacto: Mejor visibilidad de configuración exacta de cookies
 */
export function getAuthCookieOptionsDebugInfo(maxAge?: number): Record<string, unknown> {
  const options = getAuthCookieOptions(maxAge);
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    domain: options.domain || '(not set - browser auto-detect)',
    maxAge: options.maxAge || '(session)',
    nodeEnv: process.env.NODE_ENV,
  };
}

/**
 * Get cookie options for clearing authentication token
 *
 * Must match exactly the options used when setting the cookie.
 */
export function getAuthCookieClearOptions(): CookieOptions {
  return getAuthCookieOptions();
}
