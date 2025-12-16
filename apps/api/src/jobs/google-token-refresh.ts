/**
 * Google Token Refresh Job
 *
 * AI_DECISION: Job automático para refrescar tokens de Google OAuth2
 * Justificación: Los access tokens expiran después de 1 hora, necesitamos refrescarlos automáticamente
 * Impacto: Los usuarios no necesitan re-autenticarse constantemente
 */

import { OAuth2Client } from 'google-auth-library';
import { db, googleOAuthTokens } from '@cactus/db';
import { lt, eq } from 'drizzle-orm';
import { encryptToken, decryptToken } from '../utils/encryption';
import { env } from '../config/env';
import pino from 'pino';

const logger = pino({ name: 'google-token-refresh' });

const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

/**
 * Helper: Sleep for exponential backoff
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Refresca un token específico con retry logic y exponential backoff
 *
 * AI_DECISION: Implementar retry logic con exponential backoff
 * Justificación: Google API puede fallar temporalmente, retry aumenta robustez
 * Impacto: Menos errores por problemas transitorios de red/API
 *
 * @param tokenRecordId - ID del registro de token en la DB
 * @param maxRetries - Número máximo de reintentos (default: 3)
 * @throws Error si el token no se puede refrescar después de todos los reintentos
 */
export async function refreshGoogleToken(
  tokenRecordId: string,
  maxRetries: number = 3
): Promise<void> {
  const [tokenRecord] = await db()
    .select()
    .from(googleOAuthTokens)
    .where(eq(googleOAuthTokens.id, tokenRecordId))
    .limit(1);

  if (!tokenRecord) {
    throw new Error(`Token record not found: ${tokenRecordId}`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const refreshToken = decryptToken(
        tokenRecord.refreshTokenEncrypted,
        env.GOOGLE_ENCRYPTION_KEY
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token || !credentials.expiry_date) {
        throw new Error('Failed to refresh token: missing access_token or expiry_date');
      }

      await db()
        .update(googleOAuthTokens)
        .set({
          accessTokenEncrypted: encryptToken(credentials.access_token, env.GOOGLE_ENCRYPTION_KEY),
          expiresAt: new Date(credentials.expiry_date),
          updatedAt: new Date(),
        })
        .where(eq(googleOAuthTokens.id, tokenRecordId));

      logger.info(
        { userId: tokenRecord.userId, attempt: attempt + 1 },
        'Google token refreshed successfully'
      );
      return; // Success, exit early
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      // AI_DECISION: No reintentar errores permanentes
      // Justificación: Errores como invalid_grant requieren reconexión del usuario
      // Impacto: Ahorra recursos, falla rápido en errores irrecuperables
      const isPermanentError =
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('Token has been expired or revoked') ||
        errorMessage.includes('unauthorized_client');

      if (isPermanentError) {
        logger.error(
          { err: error, userId: tokenRecord.userId, tokenRecordId },
          'Permanent error refreshing Google token, no retry'
        );
        throw lastError;
      }

      // Si no es el último intento, esperar con exponential backoff
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10s
        logger.warn(
          {
            err: error,
            userId: tokenRecord.userId,
            tokenRecordId,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            backoffMs,
          },
          'Failed to refresh Google token, retrying with backoff'
        );
        await sleep(backoffMs);
      } else {
        logger.error(
          { err: error, userId: tokenRecord.userId, tokenRecordId, attempts: attempt + 1 },
          'Failed to refresh Google token after all retries'
        );
      }
    }
  }

  // Si llegamos aquí, fallaron todos los reintentos
  throw lastError || new Error('Failed to refresh token after all retries');
}

/**
 * Refresca todos los tokens que están próximos a expirar (en los próximos 5 minutos)
 * Ejecutado periódicamente por el scheduler
 */
export async function refreshExpiringTokens(): Promise<void> {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  const expiringTokens = await db()
    .select()
    .from(googleOAuthTokens)
    .where(lt(googleOAuthTokens.expiresAt, fiveMinutesFromNow));

  logger.info({ count: expiringTokens.length }, 'Refreshing expiring Google tokens');

  for (const token of expiringTokens) {
    try {
      await refreshGoogleToken(token.id);
    } catch (error) {
      logger.error(
        { err: error, tokenId: token.id, userId: token.userId },
        'Failed to refresh token in batch'
      );
      // Continuar con el siguiente token aunque uno falle
    }
  }
}
