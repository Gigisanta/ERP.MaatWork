import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { signUserToken } from '../auth/jwt';
import { requireAuth } from '../auth/middlewares';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  // Para demo: solo email + role opcional. En real: password/OTP/SAML.
  role: z.enum(['advisor', 'manager', 'admin']).optional()
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
    const { email, role } = parsed.data;

    // Usuario admin temporal - crear o usar usuario admin existente
    if (email === 'giolivosantarelli@gmail.com') {
      // Buscar usuario admin existente
      let adminUserRows = await db().select().from(users).where(eq(users.email, email)).limit(1);
      
      if (adminUserRows.length === 0) {
        // Crear usuario admin si no existe
        adminUserRows = await db().insert(users).values({
          email: email,
          fullName: 'Gio Santarelli',
          role: 'admin',
          isActive: true,
        }).returning();
        req.log.info({ userId: adminUserRows[0].id }, 'Admin user created');
      }
      
      const adminUser = adminUserRows[0];
      const token = await signUserToken({
        id: adminUser.id, // Usar el ID real del usuario admin
        email: adminUser.email,
        role: 'admin',
        fullName: adminUser.fullName
      });
      req.log.info({ email, role: 'admin', userId: adminUser.id }, 'Admin user logged in');
      return res.json({ token });
    }

    const rows = await db().select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'User disabled' });

    const token = await signUserToken({
      id: user.id,
      email: user.email,
      role: (role ?? user.role) as any,
      fullName: user.fullName
    });

    req.log.info({ userId: user.id, role: user.role }, 'user logged in');
    return res.json({ token });
  } catch (err) {
    req.log.error({ err }, 'login failed');
    next(err);
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  return res.json({ user });
});


export default router;


