/**
 * Auth Session Handlers
 *
 * GET /auth/me - Get current user
 * POST /auth/refresh - Refresh token
 * POST /auth/logout - Logout
 */
import type { Request, Response } from 'express';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { signUserToken, verifyUserToken } from '../../../auth/jwt';
import { type UserRole } from '../../../auth/types';
import { createRouteHandler, createAsyncHandler, HttpError } from '../../../utils/route-handler';

/**
 * GET /auth/me - Get current user
 */
export const handleGetCurrentUser = createRouteHandler(async (req: Request) => {
  const user = req.user!;
  return { user };
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
  res.cookie('token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 día
  });

  req.log.info({ userId: dbUser.id }, 'Token refreshed successfully');
  return res.json({ success: true, requestId: req.requestId });
});

/**
 * POST /auth/logout - Logout
 */
export const handleLogout = createAsyncHandler(async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  req.log.info({ userId: req.user!.id }, 'User logged out');
  return res.json({ success: true, requestId: req.requestId });
});
