import { Router } from 'express';
import { z } from 'zod';
import { db, advisorAliases, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { validate } from '../utils/validation';
import { uuidSchema } from '../utils/common-schemas';
import { normalizeAdvisorAlias } from '../utils/aum-normalization';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const listQuerySchema = z.object({}).optional();

const createBodySchema = z.object({
  alias: z.string().min(1).max(200),
  userId: uuidSchema
});

const updateBodySchema = z.object({
  alias: z.string().min(1).max(200).optional(),
  userId: uuidSchema.optional()
});

const idParamsSchema = z.object({ id: uuidSchema });

// ==========================================================
// Routes
// ==========================================================

// GET /admin/settings/advisors/aliases
router.get('/aliases', requireAuth, validate({ query: listQuerySchema }), async (req, res) => {
  const dbi = db();
  const requesterId = req.user?.id as string | undefined;
  const requesterRole = req.user?.role as 'admin' | 'manager' | 'advisor' | undefined;
  if (requesterRole === 'advisor' && requesterId) {
    const rows = await dbi.select().from(advisorAliases).where(eq(advisorAliases.userId, requesterId));
    return res.json({ ok: true, aliases: rows });
  }
  const rows = await dbi.select().from(advisorAliases);
  return res.json({ ok: true, aliases: rows });
});

// POST /admin/settings/advisors/aliases
router.post(
  '/aliases',
  requireAuth,
  validate({ body: createBodySchema }),
  async (req, res) => {
    const { alias, userId } = req.body as z.infer<typeof createBodySchema>;
    const dbi = db();
    const requesterId = req.user?.id as string | undefined;
    const requesterRole = req.user?.role as 'admin' | 'manager' | 'advisor' | undefined;
    // Advisors can only create aliases for themselves; managers/admin unrestricted
    if (!requesterId || (!['admin', 'manager'].includes(requesterRole || '') && requesterId !== userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Ensure user exists and is active
    const [user] = await dbi.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || (user as any).isActive === false) {
      return res.status(400).json({ error: 'El asesor no existe o está inactivo' });
    }

    const aliasNormalized = normalizeAdvisorAlias(alias);
    try {
      const [row] = await dbi
        .insert(advisorAliases)
        .values({ aliasRaw: alias, aliasNormalized, userId })
        .returning();
      return res.status(201).json({ ok: true, alias: row });
    } catch (e: unknown) {
      // Unique violation on aliasNormalized
      const err = e as { code?: string };
      if ((err.code as string | undefined) === '23505') {
        return res.status(409).json({ error: 'Alias ya existente' });
      }
      throw e;
    }
  }
);

// PUT /admin/settings/advisors/aliases/:id
router.put(
  '/aliases/:id',
  requireAuth,
  validate({ params: idParamsSchema, body: updateBodySchema }),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const { alias, userId } = req.body as z.infer<typeof updateBodySchema>;
    const dbi = db();
    const requesterId = req.user?.id as string | undefined;
    const requesterRole = req.user?.role as 'admin' | 'manager' | 'advisor' | undefined;

    // If advisor, ensure the alias belongs to them and they cannot reassign to other users
    if (requesterRole === 'advisor') {
      const [existing] = await dbi.select().from(advisorAliases).where(eq(advisorAliases.id, id)).limit(1);
      if (!existing || (existing as any).userId !== requesterId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (userId && userId !== requesterId) {
        return res.status(400).json({ error: 'No puedes reasignar el alias a otro usuario' });
      }
    } else if (!['admin', 'manager'].includes(requesterRole || '')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates: Partial<{ aliasRaw: string; aliasNormalized: string; userId: string }> = {};
    if (typeof alias === 'string') {
      updates.aliasRaw = alias;
      updates.aliasNormalized = normalizeAdvisorAlias(alias);
    }
    if (typeof userId === 'string') {
      // Ensure user exists
      const [u] = await dbi.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!u || (u as any).isActive === false) {
        return res.status(400).json({ error: 'El asesor no existe o está inactivo' });
      }
      updates.userId = userId;
    }

    if (Object.keys(updates).length === 0) return res.json({ ok: true });

    try {
      await dbi.update(advisorAliases).set(updates).where(eq(advisorAliases.id, id));
      return res.json({ ok: true });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if ((err.code as string | undefined) === '23505') {
        return res.status(409).json({ error: 'Alias ya existente' });
      }
      throw e;
    }
  }
);

// DELETE /admin/settings/advisors/aliases/:id
router.delete(
  '/aliases/:id',
  requireAuth,
  validate({ params: idParamsSchema }),
  async (req, res) => {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const dbi = db();
    const requesterId = req.user?.id as string | undefined;
    const requesterRole = req.user?.role as 'admin' | 'manager' | 'advisor' | undefined;

    if (requesterRole === 'advisor') {
      const [existing] = await dbi.select().from(advisorAliases).where(eq(advisorAliases.id, id)).limit(1);
      if (!existing || (existing as any).userId !== requesterId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (!['admin', 'manager'].includes(requesterRole || '')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await dbi.delete(advisorAliases).where(eq(advisorAliases.id, id));
    return res.json({ ok: true });
  }
);

export default router;


