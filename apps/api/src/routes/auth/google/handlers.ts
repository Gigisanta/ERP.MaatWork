/**
 * Google OAuth2 Handlers
 *
 * GET /auth/google/init - Inicia el flujo OAuth2
 * GET /auth/google/callback - Callback después de autorización en Google
 */

import type { Request, Response } from 'express';
import { db, users, googleOAuthTokens } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { createAsyncHandler, createRouteHandler, HttpError } from '../../../utils/route-handler';
import { getGoogleAuthUrl, exchangeCodeForTokens } from '../../../auth/google-oauth';
import { encryptToken } from '../../../utils/encryption';
import { signUserToken } from '../../../auth/jwt';
import { env } from '../../../config/env';
import { google } from 'googleapis';
import { ROLES, type UserRole } from '../../../auth/types';

/**
 * GET /auth/google/init
 * Inicia el flujo OAuth2, redirige a Google
 *
 * AI_DECISION: Soportar context parameter para login/register/profile
 * Justificación: Permite usar Google OAuth para login/register además de solo conectar calendario
 * Impacto: Usuarios pueden registrarse/loggear con Google y conectar calendario automáticamente
 */
export const handleGoogleAuthInit = createAsyncHandler(async (req: Request, res: Response) => {
  // AI_DECISION: Detectar contexto: login, register, o profile
  const context = req.query.context?.toString() || 'profile'; // 'login', 'register', 'profile'
  const redirect = req.query.redirect?.toString() || '/';

  // State como JSON: { context, redirect }
  const state = JSON.stringify({ context, redirect });
  const authUrl = getGoogleAuthUrl(state);

  req.log.info({ context, redirect }, 'Iniciando OAuth2 con Google');
  return res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * Callback después de autorización en Google
 * Maneja el intercambio de código por tokens y crea/vincula usuario
 *
 * AI_DECISION: Soportar diferentes contextos (login, register, profile)
 * Justificación: Permite diferentes flujos según origen (login, register, o solo conectar calendario)
 * Impacto: Validación apropiada para cada contexto, mejor UX
 */
export const handleGoogleAuthCallback = createAsyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    throw new HttpError(400, 'Missing authorization code');
  }

  // AI_DECISION: Parsear state para obtener context y redirect
  let context = 'profile';
  let redirectPath = '/home';

  if (state && typeof state === 'string') {
    try {
      const stateData = JSON.parse(state);
      context = stateData.context || 'profile';
      redirectPath = stateData.redirect || '/home';
    } catch {
      // Si no se puede parsear, usar state como redirect path (retrocompatibilidad)
      redirectPath = state;
    }
  }

  req.log.info({ hasCode: !!code, hasState: !!state, context }, 'Processing Google OAuth callback');

  // Intercambiar código por tokens
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    req.log.error(
      { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token },
      'Failed to obtain tokens from Google'
    );
    throw new HttpError(500, 'Failed to obtain tokens from Google');
  }

  // Obtener información del usuario desde Google
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: tokens.access_token });

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.email || !userInfo.id) {
    req.log.error({ userInfo }, 'Failed to get user info from Google');
    throw new HttpError(500, 'Failed to get user info from Google');
  }

  const googleEmail = userInfo.email;
  const googleId = userInfo.id;

  req.log.info({ googleEmail, googleId }, 'Google user info retrieved');

  // Buscar usuario existente por email
  const [existingUser] = await db()
    .select()
    .from(users)
    .where(eq(users.email, googleEmail))
    .limit(1);

  // AI_DECISION: Validar contexto antes de proceder
  // Justificación: Evitar crear cuenta duplicada o loggear usuario inexistente
  // Impacto: Mejor UX con mensajes de error específicos
  const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';

  if (context === 'register' && existingUser) {
    // Usuario ya existe pero intentó registrarse con Google
    req.log.warn({ email: googleEmail }, 'User tried to register with existing Google account');
    return res.redirect(`${frontendUrl}/login?error=account_exists`);
  }

  if (context === 'login' && !existingUser) {
    // Usuario no existe pero intentó hacer login con Google
    req.log.warn({ email: googleEmail }, 'User tried to login with non-existent Google account');
    return res.redirect(`${frontendUrl}/register?error=no_account`);
  }

  let userId: string;
  let userRole: UserRole;

  if (existingUser) {
    // Usuario existe: actualizar con googleId y tokens
    userId = existingUser.id;
    userRole = existingUser.role as UserRole;

    if (!ROLES.includes(userRole)) {
      req.log.error({ userId, invalidRole: userRole }, 'Invalid user role');
      throw new HttpError(500, 'Invalid user role configuration');
    }

    await db()
      .update(users)
      .set({
        googleId,
        lastLogin: new Date(),
      })
      .where(eq(users.id, userId));

    // Actualizar o crear tokens OAuth
    const [existingToken] = await db()
      .select()
      .from(googleOAuthTokens)
      .where(eq(googleOAuthTokens.userId, userId))
      .limit(1);

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hora

    if (existingToken) {
      await db()
        .update(googleOAuthTokens)
        .set({
          accessTokenEncrypted: encryptToken(tokens.access_token, env.GOOGLE_ENCRYPTION_KEY),
          refreshTokenEncrypted: encryptToken(tokens.refresh_token!, env.GOOGLE_ENCRYPTION_KEY),
          expiresAt,
          scope: tokens.scope || '',
          updatedAt: new Date(),
        })
        .where(eq(googleOAuthTokens.id, existingToken.id));

      req.log.info({ userId }, 'Google OAuth tokens updated');
    } else {
      await db()
        .insert(googleOAuthTokens)
        .values({
          userId,
          googleId,
          email: googleEmail,
          accessTokenEncrypted: encryptToken(tokens.access_token, env.GOOGLE_ENCRYPTION_KEY),
          refreshTokenEncrypted: encryptToken(tokens.refresh_token!, env.GOOGLE_ENCRYPTION_KEY),
          expiresAt,
          scope: tokens.scope || '',
        });

      req.log.info({ userId }, 'Google OAuth tokens created');
    }
  } else {
    // Usuario no existe: crear nuevo usuario
    const [newUser] = await db()
      .insert(users)
      .values({
        email: googleEmail,
        fullName: userInfo.name || googleEmail.split('@')[0],
        role: 'advisor', // Default role
        googleId,
        isActive: true,
      })
      .returning();

    userId = newUser.id;
    userRole = newUser.role as UserRole;

    // Crear tokens OAuth
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await db()
      .insert(googleOAuthTokens)
      .values({
        userId,
        googleId,
        email: googleEmail,
        accessTokenEncrypted: encryptToken(tokens.access_token, env.GOOGLE_ENCRYPTION_KEY),
        refreshTokenEncrypted: encryptToken(tokens.refresh_token!, env.GOOGLE_ENCRYPTION_KEY),
        expiresAt,
        scope: tokens.scope || '',
      });

    req.log.info({ userId, email: googleEmail }, 'New user created via Google OAuth');
  }

  // Generar JWT para la sesión local
  const jwtToken = await signUserToken({
    id: userId,
    email: googleEmail,
    role: userRole,
    fullName: existingUser?.fullName || userInfo.name || googleEmail.split('@')[0],
  });

  // Establecer cookie
  res.cookie('token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  });

  // AI_DECISION: Usar redirectPath del state parseado, agregar success param según contexto
  // Justificación: Diferentes contextos necesitan diferentes mensajes de éxito
  // Impacto: Usuario ve mensaje apropiado según si hizo login, register, o conectó calendario
  const url = new URL(`${frontendUrl}${redirectPath}`);

  if (context === 'login' || context === 'register') {
    // Para login/register, indicar que se conectó con Google exitosamente
    url.searchParams.set('google_auth', 'success');
  } else {
    // Para profile (solo conectar calendario), usar param original
    url.searchParams.set('google_connect', 'success');
  }

  const finalUrl = url.toString();

  req.log.info({ userId, context, redirectUrl: finalUrl }, 'Google OAuth successful, redirecting');

  return res.redirect(finalUrl);
});

/**
 * DELETE /auth/google/disconnect
 * Desconecta la cuenta de Google (elimina tokens)
 */
export const handleGoogleAuthDisconnect = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;

  // Eliminar tokens de la base de datos
  await db().delete(googleOAuthTokens).where(eq(googleOAuthTokens.userId, userId));

  req.log.info({ userId }, 'Google account disconnected (tokens deleted)');

  return { success: true };
});
