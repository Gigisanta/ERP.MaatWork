// REGLA CURSOR: Broker Accounts CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, brokerAccounts, contacts } from '@cactus/db';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter, canAccessContact } from '../auth/authorization';
import { z } from 'zod';
import { validate } from '../utils/validation';

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

    // AI_DECISION: Combinar validación de acceso con obtención de cuenta usando JOIN.
    // En lugar de obtener cuenta + canAccessContact (2 queries), hacemos una query con JOIN
    // que incluye el filtro de acceso. Esto reduce de 2 queries a 1.
    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const [account] = await db()
      .select({
        id: brokerAccounts.id,
        contactId: brokerAccounts.contactId,
        brokerName: brokerAccounts.brokerName,
        accountNumber: brokerAccounts.accountNumber,
        accountType: brokerAccounts.accountType,
        currency: brokerAccounts.currency,
        createdAt: brokerAccounts.createdAt,
        updatedAt: brokerAccounts.updatedAt,
        deletedAt: brokerAccounts.deletedAt
      })
      .from(brokerAccounts)
      .innerJoin(contacts, eq(brokerAccounts.contactId, contacts.id))
      .where(
        and(
          eq(brokerAccounts.id, id),
          isNull(brokerAccounts.deletedAt),
          isNull(contacts.deletedAt),
          accessFilter.whereClause
        )
      )
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: 'Broker account not found' });
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

// ==========================================================
// GET /broker-accounts/batch - Obtener cuentas de múltiples contactos (batch)
// ==========================================================
const batchBrokerAccountsQuerySchema = z.object({
  contactIds: z.string().min(1),
  status: z.enum(['active', 'closed']).optional()
});

router.get('/batch',
  requireAuth,
  validate({ query: batchBrokerAccountsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validateBatchIds } = await import('../utils/batch-validation');
      
      const validation = validateBatchIds(req.query.contactIds as string, {
        maxCount: 50, // Límite específico para broker accounts batch
        fieldName: 'contactIds'
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid contact IDs',
          details: validation.errors
        });
      }

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const status = req.query.status as 'active' | 'closed' | undefined;

      // Get user access scope for data isolation
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);

      // AI_DECISION: Use JOIN with access filter instead of loop to avoid N+1
      // Justificación: Elimina N queries de canAccessContact, usando JOIN con filtro de acceso
      // Impacto: Reducción de latencia de N queries a 1 query optimizada
      const conditions = [
        inArray(brokerAccounts.contactId, validation.ids),
        isNull(brokerAccounts.deletedAt)
      ];

      if (status) {
        conditions.push(eq(brokerAccounts.status, status));
      }

      const accounts = await db()
        .select({
          id: brokerAccounts.id,
          broker: brokerAccounts.broker,
          accountNumber: brokerAccounts.accountNumber,
          holderName: brokerAccounts.holderName,
          contactId: brokerAccounts.contactId,
          status: brokerAccounts.status,
          lastSyncedAt: brokerAccounts.lastSyncedAt,
          deletedAt: brokerAccounts.deletedAt,
          createdAt: brokerAccounts.createdAt
        })
        .from(brokerAccounts)
        .innerJoin(contacts, eq(brokerAccounts.contactId, contacts.id))
        .where(and(
          ...conditions,
          accessFilter.whereClause
        ))
        .orderBy(brokerAccounts.createdAt);

      req.log.info({ 
        requestedContactIds: validation.ids.length,
        returnedCount: accounts.length,
        status 
      }, 'broker accounts batch fetched');

      res.json({
        success: true,
        data: accounts
      });
    } catch (err) {
      req.log.error({ err }, 'failed to fetch broker accounts batch');
      next(err);
    }
  }
);

export default router;

