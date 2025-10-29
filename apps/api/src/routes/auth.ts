// REGLA CURSOR: Mantener pattern consistente: validación con Zod, logging con req.log, error handling con try/catch
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, users, teamMembershipRequests } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { signUserToken } from '../auth/jwt';
import { requireAuth } from '../auth/middlewares';
import bcrypt from 'bcrypt';

const router = Router();

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida por username
// Impacto: Cambia payload de /login y lógica de búsqueda
const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
  rememberMe: z.union([z.boolean(), z.string().transform(val => val === 'true')]).optional()
});

// Username case-insensitive [a-z0-9._-], 3-20 chars
const usernameRegex = /^[a-z0-9._-]{3,20}$/;
const RegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  username: z.string().regex(usernameRegex, 'Username inválido').optional(),
  password: z.string().min(6),
  role: z.enum(['advisor', 'manager']),
  requestedManagerId: z.string().uuid().optional() // Solo para advisors
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  req.log.info({ 
    action: 'login_attempt',
    identifier: req.body?.identifier || '[MISSING]',
    ip: req.ip,
    userAgent: req.get('User-Agent')
  }, 'Iniciando intento de login');

  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      const duration = Date.now() - startTime;
      req.log.warn({ 
        err: parsed.error.errors, 
        duration,
        action: 'login_attempt'
      }, 'Error de validación en login');
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const { identifier, password, rememberMe } = parsed.data;
    const trimmedIdentifier = identifier.trim();

    // Usuario admin temporal - crear o usar usuario admin existente
    if (trimmedIdentifier === 'giolivosantarelli@gmail.com') {
      // Buscar usuario admin existente
      let adminUserRows = await db().select().from(users).where(eq(users.email, trimmedIdentifier)).limit(1);
      
      if (adminUserRows.length === 0) {
        // Crear usuario admin si no existe con contraseña por defecto
        const hashedPassword = await bcrypt.hash('admin123', 10);
        adminUserRows = await db().insert(users).values({
          email: trimmedIdentifier,
          fullName: 'Gio Santarelli',
          role: 'admin',
          isActive: true,
          passwordHash: hashedPassword,
          username: 'gio',
          usernameNormalized: 'gio'
        }).returning();
        req.log.info({ userId: adminUserRows[0].id }, 'Admin user created');
      }
      
      const adminUser = adminUserRows[0];
      
      // Verificar contraseña para admin
      if (!adminUser.passwordHash || !(await bcrypt.compare(password, adminUser.passwordHash))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = await signUserToken({
        id: adminUser.id,
        email: adminUser.email,
        role: 'admin',
        fullName: adminUser.fullName
      }, rememberMe ? '30d' : '1d');
      
      // Actualizar último login
      await db().update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, adminUser.id));
      
      // Establecer cookie del servidor
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 días o 1 día
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge
      });

      const duration = Date.now() - startTime;
      req.log.info({ 
        identifier: trimmedIdentifier, 
        role: 'admin', 
        userId: adminUser.id, 
        rememberMe,
        tokenExpiry: rememberMe ? '30d' : '1d',
        duration,
        action: 'login_success'
      }, 'Admin user logged in');
      return res.json({ token });
    }

    // Determinar si el identificador es email o username
    let user = null as any;
    if (trimmedIdentifier.includes('@')) {
      const rows = await db().select().from(users).where(eq(users.email, trimmedIdentifier)).limit(1);
      user = rows[0];
    } else {
      const usernameLower = trimmedIdentifier.toLowerCase();
      const rows = await db()
        .select()
        .from(users)
        .where(eq(users.usernameNormalized, usernameLower))
        .limit(1);
      user = rows[0];
    }
    if (!user) {
      const duration = Date.now() - startTime;
      req.log.warn({ 
        identifier: trimmedIdentifier, 
        duration,
        action: 'login_failed',
        reason: 'user_not_found'
      }, 'Login failed - user not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      const duration = Date.now() - startTime;
      req.log.warn({ 
        identifier: trimmedIdentifier, 
        userId: user.id,
        duration,
        action: 'login_failed',
        reason: 'user_inactive'
      }, 'Login failed - user inactive');
      return res.status(403).json({ message: 'Usuario pendiente de aprobación' });
    }
    if (!user.passwordHash) {
      const duration = Date.now() - startTime;
      req.log.warn({ 
        identifier: trimmedIdentifier, 
        userId: user.id,
        duration,
        action: 'login_failed',
        reason: 'no_password_hash'
      }, 'Login failed - no password hash');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const duration = Date.now() - startTime;
      req.log.warn({ 
        identifier: trimmedIdentifier,
        userId: user.id,
        duration,
        action: 'login_failed',
        reason: 'invalid_password'
      }, 'Login failed - invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = await signUserToken({
      id: user.id,
      email: user.email,
      role: user.role as any,
      fullName: user.fullName
    }, rememberMe ? '30d' : '1d');

    // Actualizar último login
    await db().update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    // Establecer cookie del servidor
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 días o 1 día
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge
    });

    const duration = Date.now() - startTime;
    req.log.info({ 
      userId: user.id, 
      role: user.role, 
      identifier: trimmedIdentifier,
      rememberMe,
      tokenExpiry: rememberMe ? '30d' : '1d',
      duration,
      action: 'login_success'
    }, 'User logged in successfully');
    return res.json({ token });
  } catch (err) {
    const duration = Date.now() - startTime;
    // Log detallado del error en desarrollo
    const errorDetails = err instanceof Error ? {
      message: err.message,
      stack: err.stack,
      name: err.name
    } : err;
    
    req.log.error({ 
      err: errorDetails, 
      duration,
      action: 'login_error',
      body: req.body,
      identifier: req.body?.identifier
    }, 'Login error occurred');
    next(err);
  }
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: parsed.error.errors 
      });
    }
    const { email, fullName, password, role, requestedManagerId } = parsed.data;
    const providedUsername: string | undefined = parsed.data.username?.trim();
    const usernameNormalized = providedUsername ? providedUsername.toLowerCase() : undefined;

    // Verificar que el email no exista
    const existingUser = await db()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Verificar que el username no exista (si se envió)
    if (usernameNormalized) {
      const existingUsername = await db()
        .select()
        .from(users)
        .where(eq(users.usernameNormalized, usernameNormalized))
        .limit(1);
      if (existingUsername.length > 0) {
        return res.status(409).json({ message: 'Username already taken' });
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
        isActive: false
      })
      .returning();

    // Si es advisor y proporciona requestedManagerId, crear solicitud de membresía
    if (role === 'advisor' && requestedManagerId) {
      await db()
        .insert(teamMembershipRequests)
        .values({
          userId: newUser.id,
          managerId: requestedManagerId,
          status: 'pending'
        });
      
      req.log.info({ 
        userId: newUser.id, 
        managerId: requestedManagerId 
      }, 'Team membership request created');
    }

    req.log.info({ 
      userId: newUser.id, 
      email: newUser.email, 
      role: newUser.role,
      username: newUser.username
    }, 'User registered successfully');

    res.status(201).json({ 
      message: 'Registration successful. Your account is pending approval.',
      userId: newUser.id
    });
  } catch (err) {
    req.log.error({ err }, 'registration failed');
    next(err);
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  return res.json({ user });
});


export default router;


