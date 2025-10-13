import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, contactFieldHistory, contactTags, tags, notes, tasks, meetings, attachments, pipelineStages } from '@cactus/db';
import { eq, desc, and, isNull, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { z } from 'zod';

const router = Router();

// ==========================================================
// Schemas de validación
// ==========================================================

const createContactSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  phoneSecondary: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().length(2).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(), // ISO date
  pipelineStageId: z.string().uuid().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  riskProfile: z.enum(['low', 'mid', 'high']).optional().nullable(),
  assignedAdvisorId: z.string().uuid().optional().nullable(),
  assignedTeamId: z.string().uuid().optional().nullable(),
  nextStep: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
  customFields: z.record(z.any()).optional()
});

const updateContactSchema = createContactSchema.partial();

const patchContactSchema = z.object({
  fields: z.array(z.object({
    field: z.string(),
    value: z.any()
  }))
});

// ==========================================================
// GET /contacts - Listar contactos con filtros
// ==========================================================
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      limit = '50',
      offset = '0',
      pipelineStageId,
      assignedAdvisorId
    } = req.query;

    const conditions = [isNull(contacts.deletedAt)];

    if (pipelineStageId) {
      if (pipelineStageId === 'null' || pipelineStageId === '') {
        // Filtrar contactos sin etapa de pipeline
        conditions.push(isNull(contacts.pipelineStageId));
      } else {
        conditions.push(eq(contacts.pipelineStageId, pipelineStageId as string));
      }
    }
    if (assignedAdvisorId) {
      conditions.push(eq(contacts.assignedAdvisorId, assignedAdvisorId as string));
    }

    const items = await db()
      .select()
      .from(contacts)
      .where(and(...conditions))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(desc(contacts.updatedAt));

    // Obtener etiquetas para cada contacto
    const contactIds = items.map((c: any) => c.id);
    const contactTagsMap = new Map<string, any[]>();
    
    if (contactIds.length > 0) {
      const contactTagsList = await db()
        .select({
          contactId: contactTags.contactId,
          id: tags.id,
          name: tags.name,
          color: tags.color,
          icon: tags.icon
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(inArray(contactTags.contactId, contactIds));

      // Agrupar etiquetas por contacto
      contactTagsList.forEach((ct: any) => {
        if (!contactTagsMap.has(ct.contactId)) {
          contactTagsMap.set(ct.contactId, []);
        }
        contactTagsMap.get(ct.contactId)!.push({
          id: ct.id,
          name: ct.name,
          color: ct.color,
          icon: ct.icon
        });
      });
    }

    // Agregar etiquetas a cada contacto
    const itemsWithTags = items.map((contact: any) => ({
      ...contact,
      tags: contactTagsMap.get(contact.id) || []
    }));

    res.json({
      data: itemsWithTags,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    req.log.error({ err }, 'failed to list contacts');
    next(err);
  }
});

// ==========================================================
// GET /contacts/:id - Obtener ficha 360 de un contacto
// ==========================================================
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { includeTimeline = 'true' } = req.query;

    // Obtener contacto base
    const [contact] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Obtener tags con información completa
    const tagsResult = await db()
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        icon: tags.icon
      })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(eq(contactTags.contactId, id));

    // Timeline unificado si se solicita
    let timeline = null;
    if (includeTimeline === 'true') {
      // Obtener notas recientes
      const recentNotes = await db()
        .select()
        .from(notes)
        .where(and(eq(notes.contactId, id), isNull(notes.deletedAt)))
        .orderBy(desc(notes.createdAt))
        .limit(10);

      // Obtener tareas recientes
      const recentTasks = await db()
        .select()
        .from(tasks)
        .where(and(eq(tasks.contactId, id), isNull(tasks.deletedAt)))
        .orderBy(desc(tasks.createdAt))
        .limit(10);

      // Obtener reuniones recientes
      const recentMeetings = await db()
        .select()
        .from(meetings)
        .where(and(eq(meetings.contactId, id), isNull(meetings.deletedAt)))
        .orderBy(desc(meetings.startedAt))
        .limit(10);

      // Unificar y ordenar por fecha
      timeline = [
        ...recentNotes.map((n: any) => ({ ...n, type: 'note', timestamp: n.createdAt })),
        ...recentTasks.map((t: any) => ({ ...t, type: 'task', timestamp: t.createdAt })),
        ...recentMeetings.map((m: any) => ({ ...m, type: 'meeting', timestamp: m.startedAt }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Obtener adjuntos
    const attachmentsList = await db()
      .select()
      .from(attachments)
      .where(and(eq(attachments.contactId, id), isNull(attachments.deletedAt)))
      .orderBy(desc(attachments.createdAt))
      .limit(20);

    res.json({
      data: {
        ...contact,
        tags: tagsResult,
        timeline,
        attachments: attachmentsList
      }
    });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to get contact');
    next(err);
  }
});

// ==========================================================
// POST /contacts - Crear nuevo contacto
// ==========================================================
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createContactSchema.parse(req.body);
    const userId = req.user!.id;

    // Generar fullName
    const fullName = `${validated.firstName} ${validated.lastName}`;

    // Crear contacto primero
    const [newContact] = await db()
      .insert(contacts)
      .values({
        ...validated,
        fullName,
        lifecycleStage: 'lead', // Valor por defecto para lifecycleStage
        customFields: validated.customFields || {}
      })
      .returning();

    // Si hay notas, crear registro en tabla notes
    if (validated.notes && validated.notes.trim()) {
      await db()
        .insert(notes)
        .values({
          contactId: newContact.id,
          content: validated.notes.trim(),
          noteType: 'general',
          source: 'manual',
          authorUserId: userId
        });
      
      req.log.info({ 
        contactId: newContact.id, 
        noteCreated: true 
      }, 'contact created with note');
    } else {
      req.log.info({ 
        contactId: newContact.id, 
        noteCreated: false 
      }, 'contact created without note');
    }

    const result = newContact;

    res.status(201).json({ data: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err }, 'failed to create contact');
    next(err);
  }
});

// ==========================================================
// PUT /contacts/:id - Actualizar contacto completo
// ==========================================================
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = updateContactSchema.parse(req.body);

    // Obtener contacto actual para auditoría
    const [existing] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Actualizar fullName si cambian nombres
    let fullName = existing.fullName;
    if (validated.firstName || validated.lastName) {
      fullName = `${validated.firstName || existing.firstName} ${validated.lastName || existing.lastName}`;
    }

    // Actualizar contacto con versión incrementada
    const [updated] = await db()
      .update(contacts)
      .set({
        ...validated,
        fullName,
        version: existing.version + 1,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();

    // Registrar cambios en historial para campos clave
    const changedFields = Object.keys(validated).filter(key => {
      return validated[key as keyof typeof validated] !== existing[key as keyof typeof existing];
    });

    if (changedFields.length > 0 && req.user?.id) {
      await db()
        .insert(contactFieldHistory)
        .values(
          changedFields.map(field => ({
            contactId: id,
            fieldName: field,
            oldValue: String(existing[field as keyof typeof existing] || ''),
            newValue: String(validated[field as keyof typeof validated] || ''),
            changedByUserId: req.user!.id
          }))
        );
    }

    req.log.info({ contactId: id, changedFields }, 'contact updated');
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, contactId: req.params.id }, 'failed to update contact');
    next(err);
  }
});

// ==========================================================
// PATCH /contacts/:id - Actualizar campos específicos
// ==========================================================
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fields } = patchContactSchema.parse(req.body);

    // Obtener contacto actual
    const [existing] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Construir objeto de actualización
    const updates: any = {
      version: existing.version + 1,
      updatedAt: new Date()
    };

    for (const { field, value } of fields) {
      updates[field] = value;
    }

    // Actualizar contacto
    const [updated] = await db()
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, id))
      .returning();

    // Registrar cambios en historial
    if (req.user?.id) {
      await db()
        .insert(contactFieldHistory)
        .values(
          fields.map(({ field, value }) => ({
            contactId: id,
            fieldName: field,
            oldValue: String(existing[field as keyof typeof existing] || ''),
            newValue: String(value || ''),
            changedByUserId: req.user!.id
          }))
        );
    }

    req.log.info({ contactId: id, fields: fields.map(f => f.field) }, 'contact patched');
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, contactId: req.params.id }, 'failed to patch contact');
    next(err);
  }
});

// ==========================================================
// PATCH /contacts/:id/next-step - Actualizar próximo paso
// ==========================================================
router.patch('/:id/next-step', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nextStep } = z.object({
      nextStep: z.string().max(500).optional().nullable()
    }).parse(req.body);

    // Verificar que el contacto existe
    const [existing] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Actualizar solo el próximo paso
    const [updated] = await db()
      .update(contacts)
      .set({ 
        nextStep,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();

    // Registrar en historial si el valor cambió
    if (existing.nextStep !== nextStep) {
      await db()
        .insert(contactFieldHistory)
        .values({
          contactId: id,
          fieldName: 'nextStep',
          oldValue: existing.nextStep || '',
          newValue: nextStep || '',
          changedByUserId: req.user!.id
        });
    }

    req.log.info({ contactId: id, nextStep }, 'contact next step updated');
    res.json({ data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    req.log.error({ err, contactId: req.params.id }, 'failed to update contact next step');
    next(err);
  }
});

// ==========================================================
// DELETE /contacts/:id - Soft delete de contacto
// ==========================================================
router.delete('/:id', requireAuth, requireRole(['manager', 'admin']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [deleted] = await db()
      .update(contacts)
      .set({ deletedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    req.log.info({ contactId: id }, 'contact deleted');
    res.json({ data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to delete contact');
    next(err);
  }
});

// ==========================================================
// GET /contacts/:id/history - Obtener historial de cambios
// ==========================================================
router.get('/:id/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const history = await db()
      .select()
      .from(contactFieldHistory)
      .where(eq(contactFieldHistory.contactId, id))
      .orderBy(desc(contactFieldHistory.changedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({
      data: history,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to get contact history');
    next(err);
  }
});

export default router;

