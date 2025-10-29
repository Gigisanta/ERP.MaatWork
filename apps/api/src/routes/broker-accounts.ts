// REGLA CURSOR: Broker Accounts CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, brokerAccounts } from '@cactus/db';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { canAccessContact } from '../auth/authorization';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

const createBrokerAccountSchema = z.object({
  contactId: z.string().uuid(),
  broker: z.string().min(1).max(100),
  accountNumber: z.string().min(1).max(100),
  holderName: z.string().max(255).optional().nullable(),
  status: z.enum(['active', 'closed'])
});

const updateBrokerAccountSchema = z.object({
  broker: z.string().min(1).max(100).optional(),
  accountNumber: z.string().min(1).max(100).optional(),
  holderName: z.string().max(255).optional().nullable(),
  status: z.enum(['active', 'closed']).optional()
});

// ==========================================================
// GET /broker-accounts - Listar cuentas de un contacto
// ==========================================================
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactId } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    // Verificar que el usuario tenga acceso al contacto
    const hasAccess = await canAccessContact(userId, userRole, contactId as string);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    const accounts = await db()
      .select()
      .from(brokerAccounts)
      .where(
        and(
          eq(brokerAccounts.contactId, contactId as string),
          isNull(brokerAccounts.deletedAt)
        )
      )
      .orderBy(brokerAccounts.createdAt);

    req.log.info({ contactId, count: accounts.length }, 'broker accounts fetched');
    res.json({ data: accounts });
  } catch (err) {
    req.log.error({ err }, 'failed to fetch broker accounts');
    next(err);
  }
});

// ==========================================================
// GET /broker-accounts/:id - Obtener cuenta específica
// ==========================================================
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const [account] = await db()
      .select()
      .from(brokerAccounts)
      .where(
        and(
          eq(brokerAccounts.id, id),
          isNull(brokerAccounts.deletedAt)
        )
      )
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: 'Broker account not found' });
    }

    // Verificar que el usuario tenga acceso al contacto asociado
    const hasAccess = await canAccessContact(userId, userRole, account.contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this broker account' });
    }

    req.log.info({ accountId: id }, 'broker account fetched');
    res.json({ data: account });
  } catch (err) {
    req.log.error({ err, accountId: req.params.id }, 'failed to fetch broker account');
    next(err);
  }
});

// ==========================================================
// POST /broker-accounts - Crear cuenta manual
// ==========================================================
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createBrokerAccountSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verificar que el usuario tenga acceso al contacto
    const hasAccess = await canAccessContact(userId, userRole, validated.contactId);
    if (!hasAccess) {
      req.log.warn({ contactId: validated.contactId, userId }, 'user attempted to create broker account for inaccessible contact');
      return res.status(403).json({ error: 'Access denied to this contact' });
    }

    const [newAccount] = await db()
      .insert(brokerAccounts)
      .values(validated)
      .returning();

    req.log.info({ accountId: newAccount.id, contactId: validated.contactId }, 'broker account created');
    res.status(201).json({ data: newAccount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create broker account');
    next(err);
  }
});

// ==========================================================
// PUT /broker-accounts/:id - Actualizar cuenta
// ==========================================================
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateBrokerAccountSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Obtener la cuenta existente
    const [existing] = await db()
      .select()
      .from(brokerAccounts)
      .where(
        and(
          eq(brokerAccounts.id, id),
          isNull(brokerAccounts.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Broker account not found' });
    }

    // Verificar que el usuario tenga acceso al contacto asociado
    const hasAccess = await canAccessContact(userId, userRole, existing.contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this broker account' });
    }

    const [updated] = await db()
      .update(brokerAccounts)
      .set(validated)
      .where(eq(brokerAccounts.id, id))
      .returning();

    req.log.info({ accountId: id }, 'broker account updated');
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, accountId: req.params.id }, 'failed to update broker account');
    next(err);
  }
});

// ==========================================================
// DELETE /broker-accounts/:id - Eliminar cuenta (soft delete)
// ==========================================================
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Obtener la cuenta existente
    const [existing] = await db()
      .select()
      .from(brokerAccounts)
      .where(
        and(
          eq(brokerAccounts.id, id),
          isNull(brokerAccounts.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Broker account not found' });
    }

    // Verificar que el usuario tenga acceso al contacto asociado
    const hasAccess = await canAccessContact(userId, userRole, existing.contactId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this broker account' });
    }

    // Soft delete
    await db()
      .update(brokerAccounts)
      .set({ deletedAt: new Date() })
      .where(eq(brokerAccounts.id, id));

    req.log.info({ accountId: id }, 'broker account deleted');
    res.json({ data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, accountId: req.params.id }, 'failed to delete broker account');
    next(err);
  }
});

export default router;

