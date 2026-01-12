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

  // AI_DECISION: Use sameSite='none' in production for Cloudflare compatibility
  // Justificación: Cuando el frontend (Next.js) y el API están detrás de Cloudflare,
  //                el browser puede considerar las requests como cross-site incluso si
  //                el dominio es el mismo (.maat.work). SameSite='lax' previene que
  //                cookies se envíen en requests POST cross-site, lo que rompe la auth.
  //                SameSite='none' requiere secure=true (HTTPS only).
  // Impacto: Cookies funcionan correctamente a través de Cloudflare proxy
  // Referencias: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction, // MUST be true in production for sameSite='none'
    sameSite: isProduction ? 'none' : 'lax', // 'none' for production (Cloudflare), 'lax' for dev
    path: '/',
  };

  // AI_DECISION: Establecer domain explícitamente en producción
  // Justificación: Permite que la cookie funcione en maat.work y www.maat.work
  //                El punto inicial (.maat.work) es crítico para incluir subdominios
  // Impacto: Cookie se establece para todo el dominio maat.work
  // IMPORTANTE: Si el browser rechaza esta cookie, intentar SIN el punto inicial
  if (isProduction && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

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
