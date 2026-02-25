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
const googleOAuthClient = new OAuth2Client(
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
  // AI_DECISION: Validar que las credenciales no sean placeholders antes de intentar el intercambio
  // Justificación: Proporcionar un error más descriptivo que el genérico "invalid_client" de Google
  if (
    env.GOOGLE_CLIENT_ID === 'INGRESAR_TU_CLIENT_ID_AQUI' ||
    env.GOOGLE_CLIENT_SECRET === 'INGRESAR_TU_CLIENT_SECRET_AQUI'
  ) {
    throw new Error(
      'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.'
    );
  }

  const { tokens } = await googleOAuthClient.getToken(code);
  return tokens;
}
