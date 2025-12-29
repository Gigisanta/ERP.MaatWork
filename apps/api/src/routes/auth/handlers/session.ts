/**
 * Auth Session Handlers
 *
 * GET /auth/me - Get current user
 * POST /auth/refresh - Refresh token
 * POST /auth/logout - Logout
 */
import type { Request, Response } from 'express';
import { db, users, googleOAuthTokens } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { signUserToken, verifyUserToken } from '../../../auth/jwt';
import { type UserRole } from '../../../auth/types';
import { getAuthCookieOptions, getAuthCookieClearOptions } from '../../../auth/cookie-config';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';

/**
 * GET /auth/me - Get current user
 */
export const handleGetCurrentUser = createRouteHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  // AI_DECISION: Prevent caching of session data
  // Justificación: Ensures changes like Google connection status are reflected immediately
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');

  // AI_DECISION: Check if user has Google Calendar connected
  // Justificación: Allows frontend to show connection UI without trying to fetch events first
  // Impacto: Prevents infinite 400 error loops on home page
  let isGoogleConnected = false;
  let googleEmail: string | null = null;
  try {
    const [token] = await db()
      .select({
        id: googleOAuthTokens.id,
        email: googleOAuthTokens.email,
      })
      .from(googleOAuthTokens)
      .where(eq(googleOAuthTokens.userId, user.id))
      .limit(1);

    if (token) {
      isGoogleConnected = true;
      googleEmail = token.email;
    }
    req.log.info(
      { userId: user.id, isGoogleConnected, googleEmail },
      'Checked Google connection status'
    );
  } catch (error) {
    // If table doesn't exist yet or DB error, assume not connected but don't fail request
    req.log.warn({ err: error }, 'Failed to check Google connection status');
  }

  // AI_DECISION: Return user directly without wrapping in { user: ... }
  // Justificación: createRouteHandler already wraps in { success: true, data: ... }
  //                so returning { user: ... } creates double nesting: { success, data: { user } }
  //                Frontend expects data.data to be the user directly
  // Impacto: Consistent API response structure
  return {
    ...user,
    isGoogleConnected,
    googleEmail,
  };
});

/**
 * POST /auth/refresh - Refresh token
 */
export const handleRefreshToken = createAsyncHandler(async (req: Request, res: Response) => {
  // Obtener token de cookie o header
  let token: string | undefined;
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice('Bearer '.length);
  } else if (req.headers.cookie) {
    const m = /(?:^|; )token=([^;]+)/.exec(req.headers.cookie);
    if (m && m[1]) token = decodeURIComponent(m[1]);
  }

  if (!token) {
    throw new HttpError(401, 'No token provided');
  }

  // Verificar token actual (puede estar expirado, pero aún válido para refresh)
  let user;
  try {
    user = await verifyUserToken(token);
  } catch (err) {
    // Si el token está completamente inválido, no permitir refresh
    req.log.warn({ err }, 'Invalid token in refresh request');
    throw new HttpError(401, 'Invalid token');
  }

  // Verificar que el usuario existe y está activo
  const [dbUser] = await db()
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) {
    req.log.warn({ userId: user.id }, 'User from token not found in database');
    throw new HttpError(401, 'User not found');
  }

  if (!dbUser.isActive) {
    req.log.warn({ userId: user.id }, 'User from token is inactive');
    throw new HttpError(403, 'User account is inactive');
  }

  // Generar nuevo token con la misma duración que el login original
  // Usar '1d' por defecto (puede extenderse si se agrega rememberMe al refresh)
  const newToken = await signUserToken(
    {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      fullName: dbUser.fullName,
    },
    '1d'
  );

  // Establecer nueva cookie
  const maxAge = 24 * 60 * 60 * 1000; // 1 día
  res.cookie('token', newToken, getAuthCookieOptions(maxAge));

  req.log.info({ userId: dbUser.id }, 'Token refreshed successfully');
  return res.json({ success: true, requestId: req.requestId });
});

/**
 * POST /auth/logout - Logout
 */
export const handleLogout = createAsyncHandler(async (req: Request, res: Response) => {
  // Use exact same cookie options as login/refresh to ensure proper clearing
  res.clearCookie('token', getAuthCookieClearOptions());

  req.log.info({ userId: req.user!.id }, 'User logged out');
  return res.json({ success: true, requestId: req.requestId });
});
