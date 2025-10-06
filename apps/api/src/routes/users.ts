import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, users } from '@cactus/db';
import { requireAuth, requireRole } from '../auth/middlewares';

const router = Router();

router.get('/', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await db.select().from(users).limit(25);
    res.json(all);
  } catch (err) {
    req.log.error({ err }, 'failed to list users');
    next(err);
  }
});

export default router;


