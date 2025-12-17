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
    // AI_DECISION: Usar SameSite=None para permitir cookies en contexto de subdominios/proxy
    // Justificación: Cloudflare puede estar causando que el browser no reconozca las cookies como same-site
    // Impacto: Cookies se envían en todos los contextos HTTPS
  };

  // AI_DECISION: Establecer domain explícitamente en producción
  // Justificación: Algunos browsers (Chrome) pueden rechazar cookies sin domain explícito
  //               cuando hay proxies (Cloudflare) en el medio
  // Impacto: Cookie se establece para todo el dominio maat.work
  if (isProduction && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

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
