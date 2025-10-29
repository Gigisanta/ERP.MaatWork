// REGLA CURSOR: Endpoint de usuarios - mantener RBAC estricto (requireRole middleware), validación Zod
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, users, teamMembershipRequests } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'advisor']),
  isActive: z.boolean().default(true)
});

router.get('/', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db().select().from(users).limit(25);
    res.json({ data: all });
  } catch (err) {
    req.log.error({ err }, 'failed to list users');
    next(err);
  }
});

router.post('/', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await db()
      .select()
      .from(users)
      .where(eq(users.email, validated.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    const [newUser] = await db()
      .insert(users)
      .values(validated)
      .returning();
    
    req.log.info({ userId: newUser.id, email: newUser.email, role: newUser.role }, 'user created');
    res.status(201).json({ data: newUser });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create user');
    next(err);
  }
});

// GET /users/pending - Listar usuarios pendientes de aprobación (admin only)
router.get('/pending', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pendingUsers = await db()
      .select()
      .from(users)
      .where(eq(users.isActive, false))
      .orderBy(users.createdAt);
    
    res.json({ data: pendingUsers });
  } catch (err) {
    req.log.error({ err }, 'failed to list pending users');
    next(err);
  }
});

// GET /users/managers - Listar managers activos (público para registro)
router.get('/managers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managers = await db()
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName
      })
      .from(users)
      .where(eq(users.role, 'manager'))
      .where(eq(users.isActive, true))
      .orderBy(users.fullName);
    
    res.json({ data: managers });
  } catch (err) {
    req.log.error({ err }, 'failed to list managers');
    next(err);
  }
});

// GET /users/advisors - Listar advisors activos
router.get('/advisors', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const advisors = await db()
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName
      })
      .from(users)
      .where(eq(users.role, 'advisor'))
      .where(eq(users.isActive, true))
      .orderBy(users.fullName);
    
    res.json({ data: advisors });
  } catch (err) {
    req.log.error({ err }, 'failed to list advisors');
    next(err);
  }
});

// ==========================================================
// GET /users/me - Obtener información del usuario actual
// ==========================================================
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    
    const [user] = await db()
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        lastLogin: users.lastLogin
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ data: user });
  } catch (err) {
    req.log.error({ err }, 'failed to get current user');
    next(err);
  }
});

// ==========================================================
// POST /users/change-password - Cambiar contraseña del usuario actual
// ==========================================================
router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Se requiere contraseña actual y nueva contraseña' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Obtener usuario actual
    const [user] = await db()
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'No se puede cambiar contraseña: usuario no tiene contraseña configurada' });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hash nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await db()
      .update(users)
      .set({ passwordHash: hashedNewPassword })
      .where(eq(users.id, userId));

    req.log.info({ userId }, 'user password changed');
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    req.log.error({ err }, 'failed to change password');
    next(err);
  }
});

// ==========================================================
// POST /users - Crear usuario (admin only)
// ==========================================================
router.post('/', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, password, role, requestedManagerId } = req.body;

    if (!email || !fullName || !password || !role) {
      return res.status(400).json({ error: 'Email, nombre completo, contraseña y rol son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (!['advisor', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar si el email ya existe
    const [existingUser] = await db()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Hash contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const [newUser] = await db()
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash: hashedPassword,
        role,
        isActive: true
      })
      .returning();

    // Si es advisor y tiene manager solicitado, crear solicitud de membresía
    if (role === 'advisor' && requestedManagerId) {
      await db()
        .insert(teamMembershipRequests)
        .values({
          userId: newUser.id,
          managerId: requestedManagerId,
          status: 'approved' // Los usuarios creados por admin se aprueban automáticamente
        });
    }

    req.log.info({ userId: newUser.id, email: newUser.email }, 'user created by admin');
    res.status(201).json({ data: newUser });
  } catch (err) {
    req.log.error({ err }, 'failed to create user');
    next(err);
  }
});

// POST /users/:id/approve - Aprobar usuario (admin only)
router.post('/:id/approve', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const [updatedUser] = await db()
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.log.info({ userId: id, email: updatedUser.email }, 'user approved');
    res.json({ 
      data: updatedUser,
      message: 'User approved successfully'
    });
  } catch (err) {
    req.log.error({ err, userId: req.params.id }, 'failed to approve user');
    next(err);
  }
});

// POST /users/:id/reject - Rechazar usuario (admin only)
router.post('/:id/reject', requireAuth, requireRole(['admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Obtener datos del usuario antes de eliminarlo
    const [userToDelete] = await db()
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Eliminar usuario rechazado
    await db()
      .delete(users)
      .where(eq(users.id, id));
    
    req.log.info({ userId: id, email: userToDelete.email }, 'user rejected and deleted');
    res.json({ 
      message: 'User rejected and removed from system'
    });
  } catch (err) {
    req.log.error({ err, userId: req.params.id }, 'failed to reject user');
    next(err);
  }
});

export default router;


