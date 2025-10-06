import type { Request, Response, NextFunction } from 'express';
import { verifyUserToken } from './jwt';
import type { UserRole } from './types';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = auth.slice('Bearer '.length);
    const user = await verifyUserToken(token);
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


