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
export const getAuthCookieOptions = (maxAge?: number): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  // AI_DECISION: Set SameSite=None for production to support cross-domain cookie delivery
  // Justificación: Railway Web and API services run on different subdomains (up.railway.app).
  //                'Lax' prevents the cookie from being sent on cross-site requests to the API.
  //                'None' with 'Secure' is required for production cross-domain persistence.
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction, // true en prod
    sameSite: isProduction ? 'none' : 'lax', // 'none' en prod para cross-domain Railway
    path: '/',
    maxAge: maxAge || 24 * 60 * 60 * 1000,
    domain: cookieDomain,
  };

  // HYPER-DIAGNOSTIC LOG FOR PRODUCTION
  if (isProduction) {
    console.log(
      `[COOKIE_DIAGNOSTIC] Generated: ${JSON.stringify({
        domain: options.domain || 'BROWSER_DEFAULT',
        secure: options.secure,
        sameSite: options.sameSite,
        path: options.path,
        maxAge: options.maxAge,
      })}`
    );
  }

  return options;
};

/**
 * Get debug information about cookie options (for logging)
 *
 * AI_DECISION: Agregar helper para logging de cookies
 * Justificación: Facilita debugging de problemas de cookies en producción
 * Impacto: Mejor visibilidad de configuración exacta de cookies
 */
function getAuthCookieOptionsDebugInfo(maxAge?: number): Record<string, unknown> {
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
