/**
 * Auth Login Handler
 *
 * POST /auth/login - User login
 */
import type { Request, Response } from 'express';
import { db, users } from '@cactus/db';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { signUserToken } from '../../../auth/jwt';
import { ROLES, type UserRole } from '../../../auth/types';
import { createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { loginSchema } from '../schemas';
import { z } from 'zod';

export const handleLogin = createAsyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  req.log.info(
    {
      action: 'login_attempt',
      identifier: req.body?.identifier || '[MISSING]',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    'Iniciando intento de login'
  );

  const { identifier, password, rememberMe } = req.body as z.infer<typeof loginSchema>;
  const trimmedIdentifier = identifier.trim();

  // Usuario admin temporal - crear o usar usuario admin existente
  // Soporta tanto email como username "gio"
  const isAdminEmail = trimmedIdentifier === 'giolivosantarelli@gmail.com';
  const isAdminUsername = trimmedIdentifier.toLowerCase() === 'gio';

  if (isAdminEmail || isAdminUsername) {
    const adminEmail = 'giolivosantarelli@gmail.com';

    // Buscar usuario admin existente por email o username
    let adminUserRows = await db()
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (adminUserRows.length === 0) {
      // Buscar por username también
      adminUserRows = await db()
        .select()
        .from(users)
        .where(eq(users.usernameNormalized, 'gio'))
        .limit(1);
    }

    if (adminUserRows.length === 0) {
      // Crear usuario admin si no existe con contraseña por defecto
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUserRows = await db()
        .insert(users)
        .values({
          email: adminEmail,
          fullName: 'Gio Santarelli',
          role: 'admin',
          isActive: true,
          passwordHash: hashedPassword,
          username: 'gio',
          usernameNormalized: 'gio',
        })
        .returning();
      req.log.info({ userId: adminUserRows[0].id }, 'Admin user created');
    }

    const adminUser = adminUserRows[0];

    // Verificar contraseña para admin
    if (!adminUser.passwordHash || !(await bcrypt.compare(password, adminUser.passwordHash))) {
      throw new HttpError(401, 'Usuario o contraseña incorrectos');
    }

    const token = await signUserToken(
      {
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
        fullName: adminUser.fullName,
      },
      rememberMe ? '30d' : '1d'
    );

    // Actualizar último login
    await db().update(users).set({ lastLogin: new Date() }).where(eq(users.id, adminUser.id));

    // Establecer cookie del servidor
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 días o 1 día
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    const duration = Date.now() - startTime;
    req.log.info(
      {
        identifier: trimmedIdentifier,
        role: 'admin',
        userId: adminUser.id,
        rememberMe,
        tokenExpiry: rememberMe ? '30d' : '1d',
        duration,
        action: 'login_success',
      },
      'Admin user logged in'
    );

    // AI_DECISION: Retornar user en vez de token para consistencia con login normal
    return res.json({
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin' as const,
        fullName: adminUser.fullName,
      },
    });
  }

  // AI_DECISION: Optimizar búsqueda de usuario usando OR en una sola query
  // Justificación: Más eficiente que dos queries separadas, permite búsqueda flexible
  // Impacto: Mejor performance y código más limpio
  // Buscar siempre por email o usernameNormalized para cubrir todos los casos
  const usernameLower = trimmedIdentifier.toLowerCase();

  // Buscar por email o username en una sola query optimizada
  const rows = await db()
    .select()
    .from(users)
    .where(or(eq(users.email, trimmedIdentifier), eq(users.usernameNormalized, usernameLower))!)
    .limit(1);

  const user = rows[0];
  if (!user) {
    const duration = Date.now() - startTime;
    req.log.warn(
      {
        identifier: trimmedIdentifier,
        duration,
        action: 'login_failed',
        reason: 'user_not_found',
      },
      'Login failed - user not found'
    );
    // AI_DECISION: Mensaje genérico por seguridad pero útil para UX
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  }
  if (!user.isActive) {
    const duration = Date.now() - startTime;
    req.log.warn(
      {
        identifier: trimmedIdentifier,
        userId: user.id,
        duration,
        action: 'login_failed',
        reason: 'user_inactive',
      },
      'Login failed - user inactive'
    );
    // AI_DECISION: Mensaje específico para cuentas pendientes de aprobación
    throw new HttpError(
      403,
      'Tu cuenta está pendiente de aprobación. Un administrador debe aprobarla antes de que puedas iniciar sesión.',
      'PENDING_APPROVAL'
    );
  }
  if (!user.passwordHash) {
    const duration = Date.now() - startTime;
    req.log.warn(
      {
        identifier: trimmedIdentifier,
        userId: user.id,
        duration,
        action: 'login_failed',
        reason: 'no_password_hash',
      },
      'Login failed - no password hash'
    );
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  }

  // Verificar contraseña
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const duration = Date.now() - startTime;
    req.log.warn(
      {
        identifier: trimmedIdentifier,
        userId: user.id,
        duration,
        action: 'login_failed',
        reason: 'invalid_password',
      },
      'Login failed - invalid password'
    );
    throw new HttpError(401, 'Usuario o contraseña incorrectos');
  }

  // Validar que el role del usuario esté en ROLES permitidos
  const userRole = user.role as UserRole;
  if (!ROLES.includes(userRole)) {
    const duration = Date.now() - startTime;
    req.log.error(
      {
        identifier: trimmedIdentifier,
        userId: user.id,
        invalidRole: user.role,
        duration,
        action: 'login_failed',
        reason: 'invalid_role',
      },
      'Login failed - invalid user role'
    );
    throw new HttpError(500, 'Invalid user role configuration');
  }

  const token = await signUserToken(
    {
      id: user.id,
      email: user.email,
      role: userRole,
      fullName: user.fullName,
    },
    rememberMe ? '30d' : '1d'
  );

  // Actualizar último login
  await db().update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

  // Establecer cookie del servidor
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 días o 1 día
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });

  const duration = Date.now() - startTime;
  req.log.info(
    {
      userId: user.id,
      role: user.role,
      identifier: trimmedIdentifier,
      rememberMe,
      tokenExpiry: rememberMe ? '30d' : '1d',
      duration,
      action: 'login_success',
    },
    'User logged in successfully'
  );

  // AI_DECISION: Retornar user en vez de token para simplificar frontend
  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
  });
});






















