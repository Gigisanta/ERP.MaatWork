import type { Request, Response, NextFunction } from 'express';
import { verifyUserToken } from './jwt';
import type { UserRole } from './types';
import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.slice('Bearer '.length);
    }
    // AI_DECISION: Priorizar cookie httpOnly sobre Bearer token
    // Justificación: Cookie es más seguro (inmune a XSS), Bearer es fallback para compatibilidad
    // Impacto: La autenticación funciona principalmente vía cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    // Fallback: parsear cookie manualmente si cookie-parser no funciona
    if (!token && req.headers.cookie) {
      const m = /(?:^|; )token=([^;]+)/.exec(req.headers.cookie);
      if (m && m[1]) token = decodeURIComponent(m[1]);
    }
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const user = await verifyUserToken(token);

    // AI_DECISION: Validar role contra DB para detectar cambios de role
    // Justificación: Si el role cambió en DB, el token debe ser invalidado o actualizado
    // Impacto: Previene que usuarios con roles cambiados mantengan permisos antiguos
    const [dbUser] = await db()
      .select({ id: users.id, role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      req.log?.warn({ userId: user.id }, 'User from token not found in database');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!dbUser.isActive) {
      req.log?.warn({ userId: user.id }, 'User from token is inactive');
      return res.status(403).json({ message: 'User account is inactive' });
    }

    // Si el role cambió en DB, usar el role de DB (más reciente)
    if (dbUser.role !== user.role) {
      req.log?.warn(
        {
          userId: user.id,
          tokenRole: user.role,
          dbRole: dbUser.role,
        },
        'Role mismatch between token and database, using DB role'
      );
      user.role = dbUser.role as UserRole;
    }

    req.user = user;
    next();
  } catch (err) {
    req.log?.warn({ err }, 'auth verify failed');
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
