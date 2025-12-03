// REGLA CURSOR: Mantener pattern consistente: validación con Zod, logging con req.log, error handling con try/catch
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, users, teamMembershipRequests } from '@cactus/db';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { signUserToken, verifyUserToken } from '../auth/jwt';
import { requireAuth } from '../auth/middlewares';
import { ROLES, type UserRole } from '../auth/types';
import bcrypt from 'bcrypt';

const router = Router();

import { validate } from '../utils/validation';

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida por username
// Impacto: Cambia payload de /login y lógica de búsqueda
const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
  rememberMe: z.union([z.boolean(), z.string().transform((val) => val === 'true')]).optional(),
});

// Username case-insensitive [a-z0-9._-], 3-20 chars
const usernameRegex = /^[a-z0-9._-]{3,20}$/;
// AI_DECISION: Roles disponibles en registro público (admin solo por admin)
// Justificación: Usuarios pueden registrarse con roles operativos, admin es exclusivo
// Impacto: Todos los roles excepto admin disponibles en registro con aprobación
const RegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  username: z.string().regex(usernameRegex, 'Username inválido').optional(),
  password: z.string().min(6),
  role: z.enum(['advisor', 'manager', 'owner', 'staff']),
  requestedManagerId: z.string().uuid().optional(), // Solo para advisors
});

router.post(
  '/login',
  validate({ body: LoginSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
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

    try {
      const { identifier, password, rememberMe } = req.body;
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
          return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
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
        // Justificación: No revelar si el email/usuario existe, pero dar pista al usuario
        // Impacto: Mejor UX sin comprometer seguridad
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
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
        // Justificación: El usuario necesita saber que su cuenta existe pero está pendiente
        // Impacto: Mejor UX - el usuario sabe que no tiene problema con sus credenciales
        return res.status(403).json({
          message:
            'Tu cuenta está pendiente de aprobación. Un administrador debe aprobarla antes de que puedas iniciar sesión.',
          code: 'PENDING_APPROVAL',
        });
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
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
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
        return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
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
        return res.status(500).json({ message: 'Invalid user role configuration' });
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
      // Justificación: Cookie ya establecida, frontend solo necesita datos de usuario
      // Impacto: Elimina necesidad de segundo request a /auth/me después de login
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      // Log detallado del error en desarrollo
      const errorDetails =
        err instanceof Error
          ? {
              message: err.message,
              stack: err.stack,
              name: err.name,
            }
          : err;

      req.log.error(
        {
          err: errorDetails,
          duration,
          action: 'login_error',
          body: req.body,
          identifier: req.body?.identifier,
        },
        'Login error occurred'
      );
      next(err);
    }
  }
);

router.post(
  '/register',
  validate({ body: RegisterSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, fullName, password, role, requestedManagerId, username } = req.body;
      const providedUsername: string | undefined = username?.trim();
      const usernameNormalized = providedUsername ? providedUsername.toLowerCase() : undefined;

      // Verificar que el email no exista
      const existingUser = await db().select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({ message: 'Este email ya está registrado' });
      }

      // Verificar que el username no exista (si se envió)
      if (usernameNormalized) {
        const existingUsername = await db()
          .select()
          .from(users)
          .where(eq(users.usernameNormalized, usernameNormalized))
          .limit(1);
        if (existingUsername.length > 0) {
          return res.status(409).json({ message: 'Este nombre de usuario ya está en uso' });
        }
      }

      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario con isActive: false (pendiente de aprobación)
      const [newUser] = await db()
        .insert(users)
        .values({
          email,
          username: providedUsername,
          usernameNormalized,
          fullName,
          role,
          passwordHash: hashedPassword,
          isActive: false,
        })
        .returning();

      // Si es advisor y proporciona requestedManagerId, crear solicitud de membresía
      if (role === 'advisor' && requestedManagerId) {
        await db().insert(teamMembershipRequests).values({
          userId: newUser.id,
          managerId: requestedManagerId,
          status: 'pending',
        });

        req.log.info(
          {
            userId: newUser.id,
            managerId: requestedManagerId,
          },
          'Team membership request created'
        );
      }

      req.log.info(
        {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
          username: newUser.username,
        },
        'User registered successfully'
      );

      // AI_DECISION: Mensaje detallado de registro exitoso
      // Justificación: El usuario debe entender claramente el siguiente paso
      // Impacto: Reduce confusión sobre por qué no puede iniciar sesión inmediatamente
      res.status(201).json({
        message:
          '¡Registro exitoso! Tu cuenta ha sido creada y está pendiente de aprobación por un administrador. Te notificaremos cuando puedas iniciar sesión.',
        userId: newUser.id,
        status: 'pending_approval',
      });
    } catch (err) {
      req.log.error({ err }, 'registration failed');
      next(err);
    }
  }
);

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  return res.json({ user });
});

// AI_DECISION: Endpoint de refresh token para renovar sesión automáticamente
// Justificación: Permite renovar tokens expirados sin requerir nuevo login
// Impacto: Mejora UX, sesiones más largas sin interrupciones
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
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
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verificar token actual (puede estar expirado, pero aún válido para refresh)
    let user;
    try {
      user = await verifyUserToken(token);
    } catch (err) {
      // Si el token está completamente inválido, no permitir refresh
      req.log.warn({ err }, 'Invalid token in refresh request');
      return res.status(401).json({ message: 'Invalid token' });
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
      return res.status(401).json({ message: 'User not found' });
    }

    if (!dbUser.isActive) {
      req.log.warn({ userId: user.id }, 'User from token is inactive');
      return res.status(403).json({ message: 'User account is inactive' });
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
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'Error refreshing token');
    next(err);
  }
});

// AI_DECISION: Endpoint de logout para limpiar cookie httpOnly
// Justificación: Cookie httpOnly no puede limpiarse desde JavaScript, requiere endpoint
// Impacto: Permite cierre de sesión limpio desde frontend
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  req.log.info({ userId: req.user!.id }, 'User logged out');
  res.json({ success: true });
});

export default router;
