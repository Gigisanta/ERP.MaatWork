/**
 * Google OAuth2 Client Configuration
 *
 * AI_DECISION: Usar google-auth-library directamente sin Passport.js
 * Justificación: Más control sobre el flujo, menos dependencias, mejor integración con Express
 * Impacto: Implementación más simple y mantenible
 */

import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

/**
 * Cliente OAuth2 de Google configurado con credenciales del entorno
 */
export const googleOAuthClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

/**
 * Genera URL de autorización OAuth2 para iniciar el flujo de autenticación
 *
 * @param state - Estado opcional para CSRF protection (puede ser URL de redirect)
 * @returns URL de autorización de Google
 *
 * @example
 * ```typescript
 * const authUrl = getGoogleAuthUrl('/home');
 * res.redirect(authUrl);
 * ```
 */
export function getGoogleAuthUrl(state?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar',
  ];

  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline', // Necesario para obtener refresh token
    scope: scopes,
    prompt: 'consent', // Fuerza consent screen para obtener refresh token
    ...(state ? { state } : {}), // CSRF protection y redirect URL
  });
}

/**
 * Intercambia código de autorización por tokens OAuth2
 *
 * @param code - Código de autorización recibido del callback de Google
 * @returns Tokens OAuth2 (access_token, refresh_token, expiry_date, etc.)
 *
 * @example
 * ```typescript
 * const tokens = await exchangeCodeForTokens(code);
 * const accessToken = tokens.access_token;
 * const refreshToken = tokens.refresh_token;
 * ```
 */
export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await googleOAuthClient.getToken(code);
  return tokens;
}
