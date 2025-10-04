import { Router } from 'express';
import { db, users } from '@cactus/db';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const all = await db.select().from(users).limit(25);
    res.json(all);
  } catch (err) {
    req.log.error({ err }, 'failed to list users');
    next(err);
  }
});

export default router;


