// REGLA CURSOR: Sistema de etiquetas - mantener case-insensitive, autocompletado con debounce, validación Zod
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, tags, contactTags, tagRules, segments, segmentMembers, contacts } from '@cactus/db';
import { eq, desc, and, isNull, sql, inArray, type InferSelectModel } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { canAccessContact, getUserAccessScope, buildContactAccessFilter } from '../auth/authorization';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSchema,
  idParamSchema,
  paginationQuerySchema
} from '../utils/common-schemas';

const router = Router();
const TAGS_RULES_ENABLED = process.env.TAGS_RULES_ENABLED === 'true';

// ==========================================================
// Schemas de validación
// ==========================================================

// Query parameter schemas
const listTagsQuerySchema = z.object({
  scope: z.enum(['contact', 'meeting', 'note']).optional(),
  q: z.string().min(1).max(255).optional(),
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default('10')
});

const listRulesQuerySchema = z.object({
  tagId: z.string().uuid().optional()
});

const listSegmentsQuerySchema = z.object({
  includeShared: z.enum(['true', 'false']).optional().default('true')
});

const segmentContactsQuerySchema = paginationQuerySchema;

// Body schemas
const createTagSchema = z.object({
  scope: z.enum(['contact', 'meeting', 'note']),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6B7280'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  businessLine: z.enum(['inversiones', 'zurich', 'patrimonial']).optional().nullable()
});

const updateTagSchema = createTagSchema.partial().omit({ scope: true });

const createTagRuleSchema = z.object({
  tagId: z.string().uuid(),
  name: z.string().min(1).max(200),
  conditions: z.record(z.any()), // Estructura flexible para reglas
  isActive: z.boolean().default(true)
});

const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  filters: z.record(z.any()), // Estructura flexible para filtros
  isDynamic: z.boolean().default(true),
  refreshSchedule: z.string().optional().nullable() // cron expression
});

// ==========================================================
// GET /tags - Listar etiquetas con autocompletado
// ==========================================================
router.get('/', 
  requireAuth,
  validate({ query: listTagsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { scope, q, limit = '10' } = req.query;

    const conditions = [];
    if (scope) {
      conditions.push(eq(tags.scope, scope as string));
    }
    
    // Búsqueda con ILIKE para autocompletado
    if (q) {
      conditions.push(sql`LOWER(${tags.name}) LIKE LOWER(${'%' + q + '%'})`);
    }

    const items = await db()
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        icon: tags.icon,
        businessLine: tags.businessLine
      })
      .from(tags)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`LOWER(${tags.name})`)
      .limit(parseInt(limit as string));

    res.json({ success: true, data: items });
  } catch (err) {
    req.log.error({ err }, 'failed to list tags');
    next(err);
  }
});

// ==========================================================
// POST /tags - Crear nueva etiqueta (idempotente)
// ==========================================================
router.post('/', 
  requireAuth,
  validate({ body: createTagSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body;
    const userId = req.user!.id;

    // Buscar etiqueta existente (case-insensitive)
    const [existingTag] = await db()
      .select()
      .from(tags)
      .where(and(
        eq(tags.scope, validated.scope),
        sql`LOWER(${tags.name}) = LOWER(${validated.name})`
      ))
      .limit(1);

    if (existingTag) {
      // Retornar etiqueta existente
      return res.status(200).json({ data: existingTag });
    }

    const [newTag] = await db()
      .insert(tags)
      .values({
        ...validated,
        createdByUserId: userId
      })
      .returning();

    req.log.info({ tagId: newTag.id }, 'tag created');
    res.status(201).json({ data: newTag });
  } catch (err) {
    req.log.error({ err }, 'failed to create tag');
    next(err);
  }
});

// ==========================================================
// PUT /tags/:id - Actualizar etiqueta
// ==========================================================
router.put('/:id', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: updateTagSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = req.body;

    // Verificar que la etiqueta existe
    const [existingTag] = await db()
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Verificar permisos: solo managers y admins pueden actualizar cualquier etiqueta
    // Advisors solo pueden actualizar etiquetas que ellos crearon
    if (userRole === 'advisor') {
      if (existingTag.createdByUserId !== userId) {
        return res.status(403).json({ error: 'You can only update tags you created' });
      }
    }

    const [updated] = await db()
      .update(tags)
      .set({
        ...validated,
        updatedAt: new Date()
      })
      .where(eq(tags.id, id))
      .returning();

    req.log.info({ tagId: id }, 'tag updated');
    res.json({ success: true, data: updated });
  } catch (err) {
    req.log.error({ err, tagId: req.params.id }, 'failed to update tag');
    next(err);
  }
});

// ==========================================================
// DELETE /tags/:id - Eliminar etiqueta
// ==========================================================
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verificar que no sea etiqueta de sistema
    const [tag] = await db()
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Verificar permisos: solo managers y admins pueden eliminar cualquier etiqueta
    // Advisors solo pueden eliminar etiquetas que ellos crearon
    if (userRole === 'advisor') {
      if (tag.createdByUserId !== userId) {
        return res.status(403).json({ error: 'You can only delete tags you created' });
      }
    }

    // Eliminar tag (cascade borrará las relaciones)
    await db()
      .delete(tags)
      .where(eq(tags.id, id));

    req.log.info({ tagId: id }, 'tag deleted');
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, tagId: req.params.id }, 'failed to delete tag');
    next(err);
  }
});

// ==========================================================
// POST /tags/:id/contacts - Asignar etiqueta a contactos
// ==========================================================

const assignTagsSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1)
});

router.post('/:id/contacts', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: assignTagsSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { contactIds } = req.body;

    // Verify user has access to all contacts before adding tags
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    const accessibleContactIds = [];
    for (const contactId of contactIds) {
      const hasAccess = await canAccessContact(userId, userRole, contactId);
      if (hasAccess) {
        accessibleContactIds.push(contactId);
      } else {
        req.log.warn({ 
          tagId: id, 
          contactId, 
          userId, 
          userRole 
        }, 'user attempted to add tag to inaccessible contact');
      }
    }

    if (accessibleContactIds.length === 0) {
      return res.status(403).json({ error: 'No access to any of the specified contacts' });
    }

    // Verificar que el tag existe
    const [tag] = await db()
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Insertar relaciones (ignorar duplicados) - solo para contactos accesibles
    const values = accessibleContactIds.map(contactId => ({ tagId: id, contactId }));
    
    await db()
      .insert(contactTags)
      .values(values)
      .onConflictDoNothing();

    req.log.info({ tagId: id, count: accessibleContactIds.length }, 'tag assigned to accessible contacts');
    res.json({ 
      data: { 
        assigned: accessibleContactIds.length,
        denied: contactIds.length - accessibleContactIds.length
      } 
    });
  } catch (err) {
    req.log.error({ err, tagId: req.params.id }, 'failed to assign tag');
    next(err);
  }
});

// ==========================================================
// DELETE /tags/:id/contacts/:contactId - Quitar etiqueta de contacto
// ==========================================================
router.delete('/:id/contacts/:contactId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, contactId } = req.params;

    // Verify user has access to this contact
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const hasAccess = await canAccessContact(userId, userRole, contactId);

    if (!hasAccess) {
      req.log.warn({ 
        tagId: id, 
        contactId, 
        userId, 
        userRole 
      }, 'user attempted to remove tag from inaccessible contact');
      return res.status(404).json({ error: 'Contact not found' });
    }

    await db()
      .delete(contactTags)
      .where(and(
        eq(contactTags.tagId, id),
        eq(contactTags.contactId, contactId)
      ));

    req.log.info({ tagId: id, contactId }, 'tag removed from contact');
    res.json({ success: true, data: { removed: true } });
  } catch (err) {
    req.log.error({ err, tagId: req.params.id }, 'failed to remove tag');
    next(err);
  }
});

// ==========================================================
// GET /contacts/:id/tags - Listar etiquetas de un contacto
// ==========================================================
router.get('/contacts/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verify user has access to this contact
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const hasAccess = await canAccessContact(userId, userRole, id);

    if (!hasAccess) {
      req.log.warn({ 
        contactId: id, 
        userId, 
        userRole 
      }, 'user attempted to list tags for inaccessible contact');
      return res.status(404).json({ error: 'Contact not found' });
    }

    const contactTagsList = await db()
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        icon: tags.icon,
        businessLine: tags.businessLine
      })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(eq(contactTags.contactId, id));

    res.json({ success: true, data: contactTagsList });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to list contact tags');
    next(err);
  }
});

// ==========================================================
// PUT /tags/contacts/:id - Actualizar etiquetas de un contacto
// ==========================================================

const updateContactTagsSchema = z.object({
  add: z.array(z.union([z.string().uuid(), z.string()])).default([]),
  remove: z.array(z.string().uuid()).default([])
});

router.put('/contacts/:id', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: updateContactTagsSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { add = [], remove = [] } = req.body;

    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verify user has access to this contact
    const hasAccess = await canAccessContact(userId, userRole, id);

    if (!hasAccess) {
      req.log.warn({ 
        contactId: id, 
        userId, 
        userRole 
      }, 'user attempted to update tags for inaccessible contact');
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Procesar etiquetas a agregar (pueden ser IDs o nombres)
    const tagsToAdd: string[] = [];
    for (const item of add) {
      if (typeof item === 'string' && item.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Es un UUID, agregar directamente
        tagsToAdd.push(item);
      } else {
        // Es un nombre, buscar o crear etiqueta
        const [existingTag] = await db()
          .select()
          .from(tags)
          .where(and(
            eq(tags.scope, 'contact'),
            sql`LOWER(${tags.name}) = LOWER(${item})`
          ))
          .limit(1);

        if (existingTag) {
          tagsToAdd.push(existingTag.id);
        } else {
          // Crear nueva etiqueta
          const [newTag] = await db()
            .insert(tags)
            .values({
              scope: 'contact',
              name: item,
              color: '#6B7280',
              createdByUserId: userId
            })
            .returning();
          tagsToAdd.push(newTag.id);
        }
      }
    }

    // Remover etiquetas
    if (remove.length > 0) {
      await db()
        .delete(contactTags)
        .where(and(
          eq(contactTags.contactId, id),
          inArray(contactTags.tagId, remove)
        ));
    }

    // Agregar etiquetas (ignorar duplicados)
    if (tagsToAdd.length > 0) {
      const values = tagsToAdd.map(tagId => ({ contactId: id, tagId }));
      await db()
        .insert(contactTags)
        .values(values)
        .onConflictDoNothing();
    }

    // Obtener etiquetas actualizadas
    const updatedTags = await db()
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        icon: tags.icon,
        businessLine: tags.businessLine
      })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(eq(contactTags.contactId, id));

    req.log.info({ contactId: id, added: tagsToAdd.length, removed: remove.length }, 'contact tags updated');
    res.json({ success: true, data: updatedTags });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to update contact tags');
    next(err);
  }
});

// ==========================================================
// GET /tag-rules - Listar reglas de etiquetas
// ==========================================================
router.get('/rules', 
  requireAuth,
  validate({ query: listRulesQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tagId } = req.query;

    const conditions = [];
    if (tagId) {
      conditions.push(eq(tagRules.tagId, tagId as string));
    }

    const items = await db()
      .select()
      .from(tagRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tagRules.createdAt));

    res.json({ success: true, data: items });
  } catch (err) {
    req.log.error({ err }, 'failed to list tag rules');
    next(err);
  }
});

// ==========================================================
// POST /tag-rules - Crear regla de etiqueta
// ==========================================================
router.post('/rules', 
  requireAuth, 
  requireRole(['manager', 'admin']),
  validate({ body: createTagRuleSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body;
    const userId = req.user!.id;

    const [newRule] = await db()
      .insert(tagRules)
      .values({
        ...validated,
        createdByUserId: userId
      })
      .returning();

    req.log.info({ ruleId: newRule.id }, 'tag rule created');
    res.status(201).json({ data: newRule });
  } catch (err) {
    req.log.error({ err }, 'failed to create tag rule');
    next(err);
  }
});

// ==========================================================
// POST /tag-rules/:id/evaluate - Evaluar regla y aplicar
// ==========================================================
router.post('/rules/:id/evaluate', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [rule] = await db()
      .select()
      .from(tagRules)
      .where(eq(tagRules.id, id))
      .limit(1);

    if (!rule) {
      return res.status(404).json({ error: 'Tag rule not found' });
    }

    if (!TAGS_RULES_ENABLED) {
      return res.status(501).json({ error: 'Tag rules evaluation disabled' });
    }

    // TODO: Implementar evaluación real de reglas
    const matchedContactIds: string[] = [];
    
    req.log.info({ ruleId: id, matched: matchedContactIds.length }, 'rule evaluated');
    res.json({ 
      data: { 
        ruleId: id,
        matched: matchedContactIds.length,
        preview: matchedContactIds.slice(0, 10)
      } 
    });
  } catch (err) {
    req.log.error({ err, ruleId: req.params.id }, 'failed to evaluate rule');
    next(err);
  }
});

// ==========================================================
// GET /segments - Listar segmentos
// ==========================================================
router.get('/segments', 
  requireAuth,
  validate({ query: listSegmentsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { includeShared = 'true' } = req.query;

    const conditions = [eq(segments.ownerId, userId)];

    if (includeShared === 'true') {
      conditions.push(eq(segments.isShared, true));
    }

    const items = await db()
      .select()
      .from(segments)
      .where(sql`${segments.ownerId} = ${userId} OR ${segments.isShared} = true`)
      .orderBy(desc(segments.updatedAt));

    res.json({ success: true, data: items });
  } catch (err) {
    req.log.error({ err }, 'failed to list segments');
    next(err);
  }
});

// ==========================================================
// POST /segments - Crear nuevo segmento
// ==========================================================
router.post('/segments', 
  requireAuth,
  validate({ body: createSegmentSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = req.body;
    const userId = req.user!.id;

    const [newSegment] = await db()
      .insert(segments)
      .values({
        ...validated,
        ownerId: userId,
        contactCount: 0
      })
      .returning();

    req.log.info({ segmentId: newSegment.id }, 'segment created');
    res.status(201).json({ data: newSegment });
  } catch (err) {
    req.log.error({ err }, 'failed to create segment');
    next(err);
  }
});

// ==========================================================
// POST /segments/:id/refresh - Refrescar segmento dinámico
// ==========================================================
router.post('/segments/:id/refresh', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user access scope for data isolation
    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const [segment] = await db()
      .select()
      .from(segments)
      .where(eq(segments.id, id))
      .limit(1);

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    if (!segment.isDynamic) {
      return res.status(400).json({ error: 'Segment is not dynamic' });
    }

    if (!TAGS_RULES_ENABLED) {
      return res.status(501).json({ error: 'Segments refresh disabled' });
    }
    
    // TODO: Implementar evaluación real de filtros
    await db()
      .delete(segmentMembers)
      .where(eq(segmentMembers.segmentId, id));

    // Mock: agregar algunos contactos (TODO: debe respetar accessFilter.whereClause)
    const matchedContactIds: string[] = [];

    // Actualizar contador
    await db()
      .update(segments)
      .set({
        contactCount: matchedContactIds.length,
        lastRefreshedAt: new Date()
      })
      .where(eq(segments.id, id));

    req.log.info({ segmentId: id, contacts: matchedContactIds.length }, 'segment refreshed');
    res.json({ 
      data: { 
        segmentId: id, 
        contactCount: matchedContactIds.length 
      } 
    });
  } catch (err) {
    req.log.error({ err, segmentId: req.params.id }, 'failed to refresh segment');
    next(err);
  }
});

// ==========================================================
// GET /segments/:id/contacts - Listar contactos de segmento
// ==========================================================
router.get('/segments/:id/contacts', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    query: segmentContactsQuerySchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0' } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user access scope for data isolation
    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const members = await db()
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.segmentId, id))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    type SegmentMember = InferSelectModel<typeof segmentMembers>;
    const contactIds = members.map((m: SegmentMember) => m.contactId);

    let contactsList = [];
    if (contactIds.length > 0) {
      // Filter contacts by user access scope
      contactsList = await db()
        .select()
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIds),
          accessFilter.whereClause
        ));
    }

    res.json({
      data: contactsList,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    req.log.error({ err, segmentId: req.params.id }, 'failed to list segment contacts');
    next(err);
  }
});

// ==========================================================
// GET /segments/:id/export - Exportar segmento a CSV
// ==========================================================
router.get('/segments/:id/export', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get user access scope for data isolation
    const accessScope = await getUserAccessScope(userId, userRole);
    const accessFilter = buildContactAccessFilter(accessScope);

    const members = await db()
      .select()
      .from(segmentMembers)
      .where(eq(segmentMembers.segmentId, id));

    type SegmentMember = InferSelectModel<typeof segmentMembers>;
    const contactIds = members.map((m: SegmentMember) => m.contactId);

    let contactsList = [];
    if (contactIds.length > 0) {
      // Filter contacts by user access scope
      contactsList = await db()
        .select()
        .from(contacts)
        .where(and(
          inArray(contacts.id, contactIds),
          accessFilter.whereClause
        ));
    }

    // Convertir a CSV simple
    const headers = ['id', 'fullName', 'email', 'phone', 'pipelineStageId', 'assignedAdvisorId'];
    const csv = [
      headers.join(','),
      ...contactsList.map((item: InferSelectModel<typeof contacts>) => headers.map(h => item[h as keyof typeof item] || '').join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="segment_export_${id}_${new Date().toISOString()}.csv"`);
    res.send(csv);

    req.log.info({ segmentId: id, count: contactsList.length }, 'segment exported');
  } catch (err) {
    req.log.error({ err, segmentId: req.params.id }, 'failed to export segment');
    next(err);
  }
});

export default router;

