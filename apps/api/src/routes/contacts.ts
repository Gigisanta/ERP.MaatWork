// REGLA CURSOR: Endpoint principal de contactos - mantener RBAC y data isolation, no alterar sin documentar breaking changes
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, contactFieldHistory, contactTags, tags, tasks, attachments, pipelineStages, pipelineStageHistory, users } from '@cactus/db';
import { eq, desc, and, isNull, sql, inArray, type InferSelectModel } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter, canAccessContact, canAssignContactTo } from '../auth/authorization';
import { createDrizzleLogger } from '../utils/db-logger';
import { transactionWithLogging } from '../utils/db-transactions';
import { z } from 'zod';
import { validate } from '../utils/validation';
import { 
  uuidSchema, 
  idParamSchema,
  paginationQuerySchema 
} from '../utils/common-schemas';
import { 
  type Contact, 
  type ContactTag,
  type ContactTagWithInfo, 
  type ContactWithTags, 
  type TimelineItem,
  type ContactUpdateFields
} from '../types/contacts';
import { getProspectoStageId } from '../utils/pipeline-stages';
import { createUserRateLimiter } from '../utils/rate-limiter';
import { getHttpClient } from '../utils/http-client';
import { env } from '../config/env';

const router = Router();

// Rate limiter para webhooks (por usuario)
const webhookRateLimiter = createUserRateLimiter({
  capacity: env.N8N_WEBHOOK_RATE_LIMIT,
  refillPerSec: env.N8N_WEBHOOK_RATE_LIMIT / 60 // Refill rate: capacidad por minuto
});

// ==========================================================
// Schemas de validación
// ==========================================================

// Query parameter schemas
// AI_DECISION: Usar .and() en lugar de .extend() porque paginationQuerySchema es ZodEffects
// Justificación: .extend() solo funciona en ZodObject, pero paginationQuerySchema tiene .refine()
// Impacto: Schema combinado correctamente manteniendo validación de paginación
const listContactsQuerySchema = paginationQuerySchema.and(
  z.object({
    pipelineStageId: z.string().uuid().optional(),
    assignedAdvisorId: z.string().uuid().optional()
  })
);

const contactDetailQuerySchema = z.object({
  includeTimeline: z.enum(['true', 'false']).optional().default('true')
});

const historyQuerySchema = paginationQuerySchema;

// Body schemas
const optionalLongText = z.string().max(2000).trim().optional().nullable();
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
  dni: z.string().max(50).optional().nullable(),
  pipelineStageId: z.string().uuid().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  riskProfile: z.enum(['low', 'mid', 'high']).optional().nullable(),
  assignedAdvisorId: z.string().uuid().optional().nullable(),
  assignedTeamId: z.string().uuid().optional().nullable(),
  nextStep: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
  queSeDedica: optionalLongText,
  familia: optionalLongText,
  expectativas: optionalLongText,
  objetivos: optionalLongText,
  requisitosPlanificacion: optionalLongText,
  prioridades: z.array(z.string().max(500)).optional().default([]),
  preocupaciones: z.array(z.string().max(500)).optional().default([]),
  ingresos: z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/).transform((val) => parseFloat(val))]).optional().nullable(),
  gastos: z.union([z.number(), z.string().regex(/^\d+(\.\d{1,2})?$/).transform((val) => parseFloat(val))]).optional().nullable(),
  excedente: z.union([z.number(), z.string().regex(/^-?\d+(\.\d{1,2})?$/).transform((val) => parseFloat(val))]).optional().nullable(),
  customFields: z.record(z.any()).optional()
});

const updateContactSchema = createContactSchema.partial();

const patchContactSchema = z.object({
  fields: z.array(z.object({
    field: z.string(),
    value: z.any()
  }))
});

// Webhook export schema - más permisivo para aceptar contactos existentes
// AI_DECISION: Schema permisivo para webhook export
// Justificación: Los contactos existentes pueden tener datos inválidos (emails mal formateados, etc.)
// No debemos rechazar el envío completo por validaciones estrictas, el webhook puede manejar los datos
// Impacto: Permite exportar todos los contactos sin fallar por validaciones estrictas
// Usa .passthrough() para aceptar cualquier campo adicional que pueda venir del frontend
const webhookContactSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string().optional(), // Puede no estar presente en algunos casos
  email: z.union([z.string(), z.null()]).optional(), // Permite cualquier string o null, sin validar formato
  phone: z.union([z.string(), z.null()]).optional(),
  country: z.union([z.string(), z.null()]).optional(),
  dni: z.union([z.string(), z.null()]).optional(),
  pipelineStageId: z.union([z.string().uuid(), z.null()]).optional(),
  source: z.union([z.string(), z.null()]).optional(),
  riskProfile: z.union([z.enum(['low', 'mid', 'high']), z.null()]).optional(),
  assignedAdvisorId: z.union([z.string().uuid(), z.null()]).optional(),
  assignedTeamId: z.union([z.string().uuid(), z.null()]).optional(),
  nextStep: z.union([z.string(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  queSeDedica: z.union([z.string(), z.null()]).optional(),
  familia: z.union([z.string(), z.null()]).optional(),
  expectativas: z.union([z.string(), z.null()]).optional(),
  objetivos: z.union([z.string(), z.null()]).optional(),
  requisitosPlanificacion: z.union([z.string(), z.null()]).optional(),
  prioridades: z.union([z.array(z.string()), z.null()]).optional(),
  preocupaciones: z.union([z.array(z.string()), z.null()]).optional(),
  ingresos: z.union([z.number(), z.string(), z.null()]).optional(),
  gastos: z.union([z.number(), z.string(), z.null()]).optional(),
  excedente: z.union([z.number(), z.string(), z.null()]).optional(),
  customFields: z.union([z.record(z.any()), z.null()]).optional(),
  contactLastTouchAt: z.union([z.string(), z.null()]).optional(),
  pipelineStageUpdatedAt: z.union([z.string(), z.null()]).optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
  version: z.union([z.number(), z.null()]).optional(),
  deletedAt: z.union([z.string(), z.date(), z.null()]).optional(),
  tags: z.array(z.any()).optional() // Tags pueden venir del frontend
}).passthrough(); // Permite campos adicionales que puedan venir del frontend (phoneSecondary, whatsapp, address, city, dateOfBirth, etc.)

const webhookExportSchema = z.object({
  webhookUrl: z.string().url().refine(url => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'URL must use http:// or https://'),
  contacts: z.array(webhookContactSchema).min(1, 'At least one contact is required'),
  metadata: z.object({
    filters: z.object({
      stage: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      search: z.string().nullable().optional(),
      advisorId: z.string().nullable().optional()
    }).optional()
  }).optional()
});

// ==========================================================
// GET /contacts - Listar contactos con filtros
// ==========================================================
router.get('/', 
  requireAuth,
  validate({ query: listContactsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  req.log.info({ 
    userId, 
    userRole, 
    action: 'list_contacts',
    query: req.query 
  }, 'Iniciando listado de contactos');

  try {
    const { 
      limit = '50',
      offset = '0',
      pipelineStageId,
      assignedAdvisorId
    } = req.query;

    // Get user access scope for data isolation
    req.log.info({ userId, userRole }, 'Getting user access scope');
    const accessScope = await getUserAccessScope(userId, userRole);
    req.log.info({ 
      accessScope: {
        userId: accessScope.userId,
        role: accessScope.role,
        accessibleAdvisorIdsCount: accessScope.accessibleAdvisorIds.length,
        canSeeUnassigned: accessScope.canSeeUnassigned
      }
    }, 'User access scope obtained');
    
    // AI_DECISION: Validate and build access filter with assignedAdvisorId support
    // Justificación: When filtering by assignedAdvisorId, we need to ensure the user has access
    // to that advisor AND exclude unassigned contacts from the filter
    // Impacto: Fixes the issue where managers see wrong contacts when filtering by team member
    
    // If filtering by assignedAdvisorId, validate access first
    if (assignedAdvisorId) {
      const advisorIdStr = assignedAdvisorId as string;
      
      req.log.info({
        userId,
        userRole,
        requestedAdvisorId: advisorIdStr,
        accessibleAdvisorIdsCount: accessScope.accessibleAdvisorIds.length,
        accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
        canSeeUnassigned: accessScope.canSeeUnassigned,
        action: 'filter_by_assigned_advisor_initiated'
      }, 'Filtering contacts by assignedAdvisorId - initializing');
      
      // For non-admin users, validate that the advisor is accessible
      if (userRole !== 'admin') {
        // Check if the advisor is in the accessible list
        const hasAccess = accessScope.accessibleAdvisorIds.length === 0 || 
                         accessScope.accessibleAdvisorIds.includes(advisorIdStr);
        
        req.log.info({
          userId,
          userRole,
          requestedAdvisorId: advisorIdStr,
          accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
          hasAccess,
          action: 'access_check_for_advisor_filter'
        }, `Access check for advisor filter: ${hasAccess ? 'GRANTED' : 'DENIED'}`);
        
        if (!hasAccess && accessScope.accessibleAdvisorIds.length > 0) {
          req.log.warn({ 
            userId, 
            userRole, 
            requestedAdvisorId: advisorIdStr,
            accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
            reason: 'advisor_not_in_accessible_list',
            action: 'access_denied_advisor_filter'
          }, 'User attempted to filter by advisor they do not have access to');
          
          // Return empty result instead of error (more user-friendly)
          return res.json({
            data: [],
            meta: {
              limit: parseInt(limit as string),
              offset: parseInt(offset as string)
            }
          });
        }
      } else {
        req.log.info({
          userId,
          userRole,
          requestedAdvisorId: advisorIdStr,
          action: 'admin_access_always_granted'
        }, 'Admin access - filtering by advisor granted automatically');
      }
      
      // Build a more specific access filter that excludes unassigned contacts
      // when filtering by a specific advisor
      const specificAccessFilter = accessScope.role === 'admin'
        ? sql`1=1` // Admin sees everything
        : accessScope.accessibleAdvisorIds.length > 0
          ? inArray(contacts.assignedAdvisorId, accessScope.accessibleAdvisorIds)
          : sql`1=0`; // No access
      
      req.log.info({
        userId,
        userRole,
        requestedAdvisorId: advisorIdStr,
        accessFilterType: accessScope.role === 'admin' ? 'admin_unrestricted' : 
                         accessScope.accessibleAdvisorIds.length > 0 ? 'team_members_filter' : 'no_access',
        action: 'building_access_filter'
      }, 'Building access filter for advisor-specific query');
      
      const conditions = [
        isNull(contacts.deletedAt),
        specificAccessFilter,
        eq(contacts.assignedAdvisorId, advisorIdStr) // Explicit filter for the specific advisor
      ];
      
      if (pipelineStageId) {
        if (pipelineStageId === 'null' || pipelineStageId === '') {
          conditions.push(isNull(contacts.pipelineStageId));
        } else {
          conditions.push(eq(contacts.pipelineStageId, pipelineStageId as string));
        }
      }
      
      req.log.info({ 
        conditionsCount: conditions.length,
        assignedAdvisorId: advisorIdStr,
        pipelineStageId: pipelineStageId || null,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        action: 'executing_advisor_filtered_query'
      }, 'Executing contacts query with specific advisor filter');
      
      const dbLogger = createDrizzleLogger(req.log);
      const items = await dbLogger.select(
        'list_contacts_main_query',
        () => db()
          .select()
          .from(contacts)
          .where(and(...conditions))
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string))
          .orderBy(desc(contacts.updatedAt))
      );
      
      // Verify that returned contacts actually have the correct assignedAdvisorId
      const contactsList = items as Contact[];
      const itemsWithCorrectAdvisor = contactsList.filter((c: Contact) => c.assignedAdvisorId === advisorIdStr);
      const itemsWithWrongAdvisor = contactsList.filter((c: Contact) => c.assignedAdvisorId !== advisorIdStr);
      
      if (itemsWithWrongAdvisor.length > 0) {
        req.log.error({
          userId,
          userRole,
          requestedAdvisorId: advisorIdStr,
          itemsCount: contactsList.length,
          itemsWithCorrectAdvisor: itemsWithCorrectAdvisor.length,
          itemsWithWrongAdvisor: itemsWithWrongAdvisor.length,
          wrongAdvisorIds: itemsWithWrongAdvisor.map((c: Contact) => c.assignedAdvisorId),
          action: 'contacts_with_wrong_advisor_detected'
        }, 'CRITICAL: Query returned contacts with incorrect assignedAdvisorId');
      }
      
      req.log.info({ 
        itemsCount: contactsList.length,
        requestedAdvisorId: advisorIdStr,
        itemsWithCorrectAdvisor: itemsWithCorrectAdvisor.length,
        itemsWithWrongAdvisor: itemsWithWrongAdvisor.length,
        action: 'main_contacts_query_completed'
      }, 'Main contacts query completed');
      
      // Obtener etiquetas para cada contacto
      const contactIds = contactsList.map((c: Contact) => c.id);
      const contactTagsMap = new Map<string, ContactTag[]>();
      
      if (contactIds.length > 0) {
        req.log.info({ contactIdsCount: contactIds.length }, 'Fetching tags for contacts');
        const contactTagsList = await dbLogger.select(
          'list_contacts_tags_query',
          () => db()
            .select({
              contactId: contactTags.contactId,
              id: tags.id,
              name: tags.name,
              color: tags.color,
              icon: tags.icon
            })
            .from(contactTags)
            .innerJoin(tags, eq(contactTags.tagId, tags.id))
            .where(inArray(contactTags.contactId, contactIds))
        ) as ContactTagWithInfo[];
        req.log.info({ tagsCount: contactTagsList.length }, 'Tags query completed');

        // Agrupar etiquetas por contacto
        contactTagsList.forEach((ct: ContactTagWithInfo) => {
          if (ct.contactId) {
            if (!contactTagsMap.has(ct.contactId)) {
              contactTagsMap.set(ct.contactId, []);
            }
            contactTagsMap.get(ct.contactId)!.push({
              id: ct.id,
              name: ct.name,
              color: ct.color,
              icon: ct.icon
            });
          }
        });
      }

      // Agregar etiquetas a cada contacto
      const itemsWithTags = contactsList.map((contact: Contact): ContactWithTags => ({
        ...contact,
        tags: contactTagsMap.get(contact.id) || []
      }));

      const duration = Date.now() - startTime;
      req.log.info({ 
        duration, 
        count: itemsWithTags.length,
        userId,
        userRole,
        requestedAdvisorId: advisorIdStr,
        accessibleAdvisorIds: accessScope.accessibleAdvisorIds,
        accessGranted: true,
        action: 'list_contacts_filtered_by_advisor'
      }, 'Listado de contactos exitoso - filtrado por advisor');

      return res.json({
        data: itemsWithTags,
        meta: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    }
    
    // AI_DECISION: Default behavior - show only user's own contacts when no advisorId filter
    // Justificación: Cada usuario debe ver SOLO sus propios contactos en /contacts por defecto.
    // Para ver contactos de otros usuarios (miembros del equipo), debe usar /contacts?advisorId=xxx explícitamente
    // o acceder desde /teams. Esto asegura data isolation por defecto.
    // Impacto: Managers y admins solo verán sus propios contactos en su CRM personal, no los de otros
    req.log.info({
      userId,
      userRole,
      action: 'default_contacts_list_own_only',
      message: 'Showing only user\'s own contacts (no advisorId filter provided)'
    }, 'Building default filter - user\'s own contacts only');

    // When no assignedAdvisorId is provided, show ONLY the current user's contacts
    const conditions = [
      isNull(contacts.deletedAt),
      eq(contacts.assignedAdvisorId, userId)
    ];

    if (pipelineStageId) {
      if (pipelineStageId === 'null' || pipelineStageId === '') {
        // Filtrar contactos sin etapa de pipeline
        conditions.push(isNull(contacts.pipelineStageId));
      } else {
        conditions.push(eq(contacts.pipelineStageId, pipelineStageId as string));
      }
    }

    // Usar helper de logging para la query principal
    const dbLogger = createDrizzleLogger(req.log);
    req.log.info({ 
      conditionsCount: conditions.length,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    }, 'Executing main contacts query');
    
    const items = await dbLogger.select(
      'list_contacts_main_query',
      () => db()
        .select()
        .from(contacts)
        .where(and(...conditions))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
        .orderBy(desc(contacts.updatedAt))
    );
    
    const contactsListMain = items as Contact[];
    req.log.info({ itemsCount: contactsListMain.length }, 'Main contacts query completed');

    // Obtener etiquetas para cada contacto
    const contactIdsMain = contactsListMain.map((c: Contact) => c.id);
    const contactTagsMapMain = new Map<string, ContactTag[]>();
    
    if (contactIdsMain.length > 0) {
      req.log.info({ contactIdsCount: contactIdsMain.length }, 'Fetching tags for contacts');
      const contactTagsListMain = await dbLogger.select(
        'list_contacts_tags_query',
        () => db()
          .select({
            contactId: contactTags.contactId,
            id: tags.id,
            name: tags.name,
            color: tags.color,
            icon: tags.icon
          })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(inArray(contactTags.contactId, contactIdsMain))
      ) as ContactTagWithInfo[];
      req.log.info({ tagsCount: contactTagsListMain.length }, 'Tags query completed');

      // Agrupar etiquetas por contacto
      contactTagsListMain.forEach((ct: ContactTagWithInfo) => {
        if (ct.contactId) {
          if (!contactTagsMapMain.has(ct.contactId)) {
            contactTagsMapMain.set(ct.contactId, []);
          }
          contactTagsMapMain.get(ct.contactId)!.push({
            id: ct.id,
            name: ct.name,
            color: ct.color,
            icon: ct.icon
          });
        }
      });
    }

    // Agregar etiquetas a cada contacto
    const itemsWithTags = contactsListMain.map((contact: Contact): ContactWithTags => ({
      ...contact,
      tags: contactTagsMapMain.get(contact.id) || []
    }));

    const duration = Date.now() - startTime;
    req.log.info({ 
      duration, 
      count: itemsWithTags.length,
      userId,
      userRole,
      action: 'list_contacts'
    }, 'Listado de contactos exitoso');

    res.json({
      data: itemsWithTags,
      meta: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    req.log.error({ 
      err, 
      duration,
      userId,
      userRole,
      action: 'list_contacts',
      query: req.query
    }, 'Error en listado de contactos');
    next(err);
  }
});

// ==========================================================
// GET /contacts/:id - Obtener ficha 360 de un contacto
// ==========================================================
router.get('/:id', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    query: contactDetailQuerySchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const { id } = req.params;
  const { includeTimeline = 'true' } = req.query;
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  req.log.info({ 
    userId, 
    userRole, 
    action: 'get_contact_detail',
    contactId: id,
    includeTimeline 
  }, 'Iniciando obtención de detalle de contacto');

  try {
    // Verify user has access to this contact
    const hasAccess = await canAccessContact(userId, userRole, id);

    if (!hasAccess) {
      return res.status(404).json({ error: 'Contact not found' });
    }

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
      // Obtener tareas recientes
      const recentTasks = await db()
        .select()
        .from(tasks)
        .where(and(eq(tasks.contactId, id), isNull(tasks.deletedAt)))
        .orderBy(desc(tasks.createdAt))
        .limit(10);

      // Unificar y ordenar por fecha
      type TaskForTimeline = InferSelectModel<typeof tasks>;
      timeline = recentTasks.map((t: TaskForTimeline): TimelineItem => ({ 
        ...t, 
        type: 'task', 
        timestamp: t.createdAt 
      })).sort((a: TimelineItem, b: TimelineItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Obtener adjuntos
    const attachmentsList = await db()
      .select()
      .from(attachments)
      .where(and(eq(attachments.contactId, id), isNull(attachments.deletedAt)))
      .orderBy(desc(attachments.createdAt))
      .limit(20);

    const duration = Date.now() - startTime;
    req.log.info({ 
      duration, 
      contactId: id,
      userId,
      userRole,
      action: 'get_contact_detail',
      hasTimeline: !!timeline,
      attachmentsCount: attachmentsList.length
    }, 'Obtención de detalle de contacto exitosa');

    res.json({
      data: {
        ...contact,
        tags: tagsResult,
        timeline,
        attachments: attachmentsList
      }
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    req.log.error({ 
      err, 
      duration,
      contactId: id,
      userId,
      userRole,
      action: 'get_contact_detail'
    }, 'Error en obtención de detalle de contacto');
    next(err);
  }
});

// ==========================================================
// POST /contacts - Crear nuevo contacto
// ==========================================================
router.post('/', 
  requireAuth,
  validate({ body: createContactSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const userId = req.user!.id;
  const userRole = req.user!.role;
  
  req.log.info({ 
    userId, 
    userRole, 
    action: 'create_contact',
    body: { ...req.body, password: '[REDACTED]' } // Sanitizar datos sensibles
  }, 'Iniciando creación de contacto');

  try {
    // req.body ya está validado por middleware validate()
    const validated = req.body;

    // AI_DECISION: Auto-assign contacts to creator for ALL user roles
    // Justificación: Cada usuario debe tener sus contactos asignados a su ID, independientemente del rol
    // Impacto: Todos los usuarios (advisor/manager/admin) tendrán sus contactos correctamente asignados
    let validatedAdvisorId = validated.assignedAdvisorId;
    let advisorWarning = null;
    
    req.log.info({
      userId,
      userRole,
      providedAdvisorId: validated.assignedAdvisorId,
      action: 'evaluating_advisor_assignment'
    }, 'Evaluating assignedAdvisorId assignment for contact creation');
    
    // If no assignedAdvisorId provided, auto-assign to creator (ALL roles)
    if (!validated.assignedAdvisorId) {
      validatedAdvisorId = userId;
      req.log.info({
        userId,
        userRole,
        autoAssignedAdvisorId: validatedAdvisorId,
        reason: 'no_assignment_provided_auto_assign_to_creator',
        action: 'auto_assignment'
      }, 'Auto-assigned contact to creator (no assignment provided)');
    } else {
      // assignedAdvisorId was provided - validate permissions and advisor existence
      const canAssign = await canAssignContactTo(userId, userRole, validated.assignedAdvisorId);
    
      req.log.info({
        userId,
        userRole,
        providedAdvisorId: validated.assignedAdvisorId,
        canAssign,
        action: 'permission_check_result'
      }, 'Permission check for advisor assignment completed');
      
      if (!canAssign) {
      req.log.warn({ 
        providedAdvisorId: validated.assignedAdvisorId,
        userRole,
          userId,
          action: 'enforcing_auto_assignment_to_creator'
        }, 'user cannot assign contact to requested advisor, auto-assigning to creator');
      
        // Auto-assign to creator when permission denied
        validatedAdvisorId = userId;
        advisorWarning = `No tiene permisos para asignar a ese asesor. El contacto se asignó automáticamente a usted.`;
        req.log.info({
          userId,
          userRole,
          autoAssignedAdvisorId: validatedAdvisorId,
          reason: 'permission_denied_auto_assign_to_creator',
          action: 'auto_assignment'
        }, 'Auto-assigned contact to creator (permission denied)');
      } else {
      // Validate that the advisor ID exists and is active
      const [advisor] = await db()
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, validated.assignedAdvisorId), eq(users.isActive, true)))
        .limit(1);
      
      if (!advisor) {
        req.log.warn({ 
            providedAdvisorId: validated.assignedAdvisorId,
            action: 'advisor_not_found_or_inactive'
          }, 'assigned advisor ID does not exist or is inactive, auto-assigning to creator');
          
          // Auto-assign to creator when advisor not found
      validatedAdvisorId = userId;
          advisorWarning = `El asesor asignado (${validated.assignedAdvisorId}) no existe o está inactivo. El contacto se asignó automáticamente a usted.`;
          req.log.info({
            userId,
            userRole,
            autoAssignedAdvisorId: validatedAdvisorId,
            reason: 'advisor_not_found_auto_assign_to_creator',
            action: 'auto_assignment'
          }, 'Auto-assigned contact to creator (advisor not found)');
        } else {
          req.log.info({
            userId,
            userRole,
            assignedAdvisorId: validatedAdvisorId,
            advisorId: advisor.id,
            action: 'advisor_validated'
          }, 'Advisor ID validated successfully');
        }
      }
    }
    
    // Log final assignment decision before insertion
    req.log.info({
      userId,
      userRole,
      finalAssignedAdvisorId: validatedAdvisorId,
      providedAdvisorId: validated.assignedAdvisorId,
      action: 'final_assignment_decision'
    }, 'Final assignedAdvisorId decision before contact insertion');

    // AI_DECISION: Asignar etapa "Prospecto" por defecto si no se proporciona pipelineStageId
    // Justificación: Todos los contactos nuevos deben comenzar en la etapa inicial del pipeline
    // Impacto: Simplifica el flujo de creación y asegura consistencia en el pipeline
    let validatedPipelineStageId = validated.pipelineStageId;
    if (!validatedPipelineStageId) {
      try {
        validatedPipelineStageId = await getProspectoStageId();
        req.log.info({
          userId,
          userRole,
          autoAssignedStageId: validatedPipelineStageId,
          reason: 'no_stage_provided_auto_assign_prospecto',
          action: 'auto_assignment_stage'
        }, 'Auto-assigned contact to Prospecto stage (no stage provided)');
      } catch (error) {
        req.log.error({
          err: error,
          userId,
          userRole,
          action: 'failed_to_get_prospecto_stage'
        }, 'Failed to get Prospecto stage ID, creating contact without stage');
        // Continuar sin etapa si hay un error (no debería pasar, pero mejor ser resiliente)
      }
    }

    // Generar fullName
    const fullName = `${validated.firstName} ${validated.lastName}`;

    // Crear contacto primero
    const dbLogger = createDrizzleLogger(req.log);
    const newContactResult = await dbLogger.insert(
      'create_contact_main',
      () => db()
        .insert(contacts)
        .values({
          ...validated,
          pipelineStageId: validatedPipelineStageId,
          assignedAdvisorId: validatedAdvisorId,
          fullName,
          customFields: validated.customFields || {}
        })
        .returning()
    );
    type NewContactResult = Contact;
    const [newContact] = newContactResult as NewContactResult[];

    // AI_DECISION: Verify assignedAdvisorId was saved correctly after insertion
    // Justificación: Ensures data integrity and catches any assignment failures
    // Impacto: Provides immediate verification that assignedAdvisorId was correctly persisted
    const savedAssignedAdvisorId = newContact.assignedAdvisorId;
    if (savedAssignedAdvisorId !== validatedAdvisorId) {
      req.log.error({
        contactId: newContact.id,
        expectedAssignedAdvisorId: validatedAdvisorId,
        actualAssignedAdvisorId: savedAssignedAdvisorId,
        userId,
        userRole,
        action: 'assigned_advisor_id_mismatch'
      }, 'CRITICAL: assignedAdvisorId mismatch detected after contact creation');
    } else {
      req.log.info({
        contactId: newContact.id,
        assignedAdvisorId: savedAssignedAdvisorId,
        userId,
        userRole,
        action: 'assigned_advisor_id_verified'
      }, 'assignedAdvisorId verified successfully after contact creation');
    }

    // Query database to double-check assignedAdvisorId was persisted correctly
    const [verifiedContact] = await db()
      .select({ assignedAdvisorId: contacts.assignedAdvisorId })
      .from(contacts)
      .where(eq(contacts.id, newContact.id))
      .limit(1);
    
    if (verifiedContact) {
      if (verifiedContact.assignedAdvisorId !== validatedAdvisorId) {
        req.log.error({
          contactId: newContact.id,
          expectedAssignedAdvisorId: validatedAdvisorId,
          dbAssignedAdvisorId: verifiedContact.assignedAdvisorId,
          action: 'db_verification_failed'
        }, 'CRITICAL: Database verification failed - assignedAdvisorId mismatch');
      } else {
        req.log.info({
          contactId: newContact.id,
          dbAssignedAdvisorId: verifiedContact.assignedAdvisorId,
          action: 'db_verification_success'
        }, 'Database verification successful - assignedAdvisorId correctly persisted');
      }
    } else {
      req.log.error({
        contactId: newContact.id,
        action: 'db_verification_contact_not_found'
      }, 'CRITICAL: Could not verify contact in database after creation');
    }

    // AI_DECISION: Registrar historial de pipeline stage al crear contacto
    // Justificación: Garantiza que todos los contactos tengan historial completo, incluso si se crean directamente en una etapa avanzada
    // Impacto: Métricas más precisas y consistentes, permite rastrear correctamente contactos creados en cualquier etapa
    if (validatedPipelineStageId && userId && userId !== '00000000-0000-0000-0000-000000000001') {
      try {
        await db()
          .insert(pipelineStageHistory)
          .values({
            contactId: newContact.id,
            fromStage: null,
            toStage: validatedPipelineStageId,
            reason: null,
            changedByUserId: userId
          });
        req.log.info({
          contactId: newContact.id,
          toStage: validatedPipelineStageId,
          userId
        }, 'pipeline stage history registered on contact creation');
      } catch (historyError) {
        // No fallar la creación del contacto si falla el registro de historial
        req.log.error({
          err: historyError,
          contactId: newContact.id,
          toStage: validatedPipelineStageId
        }, 'failed to register pipeline stage history on contact creation (non-fatal)');
      }
    }

    // Si hay notas
    if (validated.notes && validated.notes.trim()) {
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
    const duration = Date.now() - startTime;
    
    req.log.info({ 
      duration, 
      contactId: newContact.id,
      userId,
      userRole,
      action: 'create_contact',
      hasNote: !!validated.notes?.trim(),
      expectedAssignedAdvisorId: validatedAdvisorId,
      savedAssignedAdvisorId: savedAssignedAdvisorId,
      dbVerifiedAssignedAdvisorId: verifiedContact?.assignedAdvisorId,
      advisorWarning: !!advisorWarning,
      assignmentVerified: savedAssignedAdvisorId === validatedAdvisorId,
      pipelineStageId: validatedPipelineStageId,
      providedPipelineStageId: validated.pipelineStageId,
      stageAutoAssigned: !validated.pipelineStageId
    }, 'Creación de contacto exitosa');

    res.status(201).json({ 
      success: true,
      data: result,
      warning: advisorWarning 
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    
    req.log.error({ 
      err, 
      duration,
      userId,
      userRole,
      action: 'create_contact'
    }, 'Error en creación de contacto');
    next(err);
  }
});

// ==========================================================
// PUT /contacts/:id - Actualizar contacto completo
// ==========================================================
router.put('/:id', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: updateContactSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = req.body;

    // Verify user has access to this contact
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const hasAccess = await canAccessContact(userId, userRole, id);

    if (!hasAccess) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Obtener contacto actual para auditoría
    const [existing] = await db()
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Enforce assignment rules if assignedAdvisorId is being updated
    let validatedAdvisorId = validated.assignedAdvisorId;
    let advisorWarning = null;
    
    if (validated.assignedAdvisorId !== undefined && validated.assignedAdvisorId !== existing.assignedAdvisorId) {
      const canAssign = await canAssignContactTo(userId, userRole, validated.assignedAdvisorId);
      
      if (!canAssign) {
        req.log.warn({ 
          contactId: id,
          requestedAdvisorId: validated.assignedAdvisorId,
          currentAdvisorId: existing.assignedAdvisorId,
          userRole,
          userId
        }, 'user cannot reassign contact to requested advisor');
        
        // Enforce role-based assignment rules
        if (userRole === 'advisor') {
          validatedAdvisorId = userId; // Advisors can only assign to themselves
          advisorWarning = `Como asesor, el contacto se asignó automáticamente a usted.`;
        } else {
          validatedAdvisorId = existing.assignedAdvisorId; // Keep current assignment
          advisorWarning = `No tiene permisos para reasignar a ese asesor. Se mantiene la asignación actual.`;
        }
      } else if (validated.assignedAdvisorId) {
        // Validate that the advisor ID exists and is active
        const [advisor] = await db()
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, validated.assignedAdvisorId), eq(users.isActive, true)))
          .limit(1);
        
        if (!advisor) {
          req.log.warn({ 
            contactId: id,
            requestedAdvisorId: validated.assignedAdvisorId 
          }, 'requested advisor ID does not exist or is inactive, keeping current assignment');
          
          validatedAdvisorId = existing.assignedAdvisorId;
          advisorWarning = `El asesor solicitado no existe o está inactivo. Se mantiene la asignación actual.`;
        }
      }
    }

    // Actualizar fullName si cambian nombres
    let fullName = existing.fullName;
    if (validated.firstName || validated.lastName) {
      fullName = `${validated.firstName || existing.firstName} ${validated.lastName || existing.lastName}`;
    }

    // Verificar si pipelineStageId cambió para registrar en historial
    const pipelineStageChanged = validated.pipelineStageId !== undefined && 
      validated.pipelineStageId !== existing.pipelineStageId;
    const oldPipelineStageId = existing.pipelineStageId;
    const newPipelineStageId = validated.pipelineStageId;

    // Actualizar contacto con versión incrementada
    const updateData: {
      [key: string]: unknown;
    } = {
      ...validated,
      assignedAdvisorId: validatedAdvisorId,
      fullName,
      version: existing.version + 1,
      updatedAt: new Date()
    };

    // Si pipelineStageId cambió, actualizar también pipelineStageUpdatedAt
    if (pipelineStageChanged && newPipelineStageId) {
      updateData.pipelineStageUpdatedAt = new Date();
    }

    // Registrar cambios en historial para campos clave (antes de la transacción para logging)
    const changedFields = Object.keys(validated).filter(key => {
      return validated[key as keyof typeof validated] !== existing[key as keyof typeof existing];
    });

    // AI_DECISION: Usar transacción para asegurar consistencia entre update de contacto e historial
    // Justificación: Update de contacto y registros de historial deben ser atómicos
    // Si falla el insert de historial, el update de contacto debe hacer rollback
    // Impacto: Historial siempre consistente con el estado actual del contacto
    const updated = await transactionWithLogging(
      req.log,
      'update-contact-with-history',
      async (tx) => {
        // Actualizar contacto dentro de la transacción con validación de versión (optimistic locking)
        const [updatedContact] = await tx
          .update(contacts)
          .set(updateData)
          .where(and(
            eq(contacts.id, id),
            eq(contacts.version, existing.version) // Validar versión para optimistic locking
          ))
          .returning();

        if (!updatedContact) {
          // Si no se actualizó, puede ser por versión conflict o contacto no encontrado
          // Verificar si el contacto existe con versión diferente
          const [current] = await tx
            .select({ version: contacts.version })
            .from(contacts)
            .where(eq(contacts.id, id))
            .limit(1);
          
          if (current && current.version !== existing.version) {
            const versionError = new Error('Version conflict');
            versionError.name = 'VersionConflictError';
            throw versionError;
          }
          throw new Error('Contact not found');
        }

        // Registrar cambios en historial para campos clave dentro de la transacción
        if (changedFields.length > 0 && req.user?.id) {
          await tx
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

        // Registrar cambio de pipeline stage en historial dentro de la transacción si cambió
        if (pipelineStageChanged && newPipelineStageId && req.user?.id && req.user.id !== '00000000-0000-0000-0000-000000000001') {
          await tx
            .insert(pipelineStageHistory)
            .values({
              contactId: id,
              fromStage: oldPipelineStageId || null,
              toStage: newPipelineStageId,
              reason: null,
              changedByUserId: req.user.id
            });
          req.log.info({ contactId: id, fromStage: oldPipelineStageId, toStage: newPipelineStageId }, 'pipeline stage changed via contact update');
        }

        return updatedContact;
      }
    );

    req.log.info({ contactId: id, changedFields }, 'contact updated');
    res.json({ 
      success: true,
      data: updated,
      warning: advisorWarning 
    });
  } catch (err) {
    // Manejar errores de versión conflict en PUT
    if (err instanceof Error && err.name === 'VersionConflictError') {
      return res.status(409).json({
        error: 'Version conflict',
        message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.'
      });
    }
    
    req.log.error({ err, contactId: req.params.id }, 'failed to update contact');
    next(err);
  }
});

// ==========================================================
// PATCH /contacts/:id - Actualizar campos específicos
// ==========================================================
router.patch('/:id', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: patchContactSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fields } = req.body;

    // Verify user has access to this contact
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const hasAccess = await canAccessContact(userId, userRole, id);

    if (!hasAccess) {
      return res.status(404).json({ error: 'Contact not found' });
    }

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
    const updates: ContactUpdateFields = {
      version: existing.version + 1,
      updatedAt: new Date()
    };

    for (const { field, value } of fields) {
      updates[field] = value;
    }

    // Enforce assignment rules if assignedAdvisorId is being updated
    let advisorWarning = null;
    
    if (updates.assignedAdvisorId !== undefined && updates.assignedAdvisorId !== existing.assignedAdvisorId) {
      const targetAdvisorId = typeof updates.assignedAdvisorId === 'string' || updates.assignedAdvisorId === null 
        ? updates.assignedAdvisorId as string | null 
        : null;
      const canAssign = await canAssignContactTo(userId, userRole, targetAdvisorId);
      
      if (!canAssign) {
        req.log.warn({ 
          contactId: id,
          requestedAdvisorId: updates.assignedAdvisorId,
          currentAdvisorId: existing.assignedAdvisorId,
          userRole,
          userId
        }, 'user cannot reassign contact to requested advisor');
        
        // Enforce role-based assignment rules
        if (userRole === 'advisor') {
          updates.assignedAdvisorId = userId; // Advisors can only assign to themselves
          advisorWarning = `Como asesor, el contacto se asignó automáticamente a usted.`;
        } else {
          updates.assignedAdvisorId = existing.assignedAdvisorId; // Keep current assignment
          advisorWarning = `No tiene permisos para reasignar a ese asesor. Se mantiene la asignación actual.`;
        }
      } else if (updates.assignedAdvisorId) {
        // Validate that the advisor ID exists and is active
        const [advisor] = await db()
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.id, updates.assignedAdvisorId), eq(users.isActive, true)))
          .limit(1);
        
        if (!advisor) {
          req.log.warn({ 
            contactId: id,
            requestedAdvisorId: updates.assignedAdvisorId 
          }, 'requested advisor ID does not exist or is inactive, keeping current assignment');
          
          updates.assignedAdvisorId = existing.assignedAdvisorId;
          advisorWarning = `El asesor solicitado no existe o está inactivo. Se mantiene la asignación actual.`;
        }
      }
    }

    // Verificar si pipelineStageId cambió para registrar en historial
    const pipelineStageField = fields.find((f: { field: string; value: unknown }) => f.field === 'pipelineStageId');
    const pipelineStageChanged = pipelineStageField && 
      pipelineStageField.value !== existing.pipelineStageId;
    const oldPipelineStageId = existing.pipelineStageId;
    const newPipelineStageId = pipelineStageField?.value as string | null | undefined;

    // Si pipelineStageId cambió, actualizar también pipelineStageUpdatedAt
    if (pipelineStageChanged && newPipelineStageId) {
      updates.pipelineStageUpdatedAt = new Date();
    }

    // AI_DECISION: Validar versión en where clause para optimistic locking
    // Justificación: Previene sobrescribir cambios concurrentes en PATCH
    // Si la versión no coincide, el update no afecta ningún registro
    // Impacto: Frontend debe manejar 409 Conflict y recargar datos
    const [updated] = await db()
      .update(contacts)
      .set(updates)
      .where(and(
        eq(contacts.id, id),
        eq(contacts.version, existing.version) // Validar versión para optimistic locking
      ))
      .returning();

    // Si no se actualizó ningún registro, significa conflicto de versión
    if (updated.length === 0) {
      req.log.warn({ 
        contactId: id, 
        expectedVersion: existing.version,
        message: 'Version conflict detected in PATCH'
      }, 'Contact PATCH failed due to version conflict');
      
      return res.status(409).json({
        error: 'Version conflict',
        message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.'
      });
    }

    // Registrar cambios en historial
    if (req.user?.id) {
      await db()
        .insert(contactFieldHistory)
        .values(
          fields.map(({ field, value }: { field: string; value: unknown }) => ({
            contactId: id,
            fieldName: field,
            oldValue: String(existing[field as keyof typeof existing] || ''),
            newValue: String(value || ''),
            changedByUserId: req.user!.id
          }))
        );
    }

    // Registrar cambio de pipeline stage en historial si cambió
    if (pipelineStageChanged && newPipelineStageId && req.user?.id && req.user.id !== '00000000-0000-0000-0000-000000000001') {
      await db()
        .insert(pipelineStageHistory)
        .values({
          contactId: id,
          fromStage: oldPipelineStageId || null,
          toStage: newPipelineStageId,
          reason: null,
          changedByUserId: req.user.id
        });
      req.log.info({ contactId: id, fromStage: oldPipelineStageId, toStage: newPipelineStageId }, 'pipeline stage changed via contact patch');
    }

    req.log.info({ contactId: id, fields: fields.map((f: { field: string; value: unknown }) => f.field) }, 'contact patched');
    res.json({ 
      success: true,
      data: updated,
      warning: advisorWarning 
    });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to patch contact');
    next(err);
  }
});

// ==========================================================
// PATCH /contacts/:id/next-step - Actualizar próximo paso
// ==========================================================

const nextStepSchema = z.object({
  nextStep: z.string().max(500).optional().nullable()
});

router.patch('/:id/next-step', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    body: nextStepSchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { nextStep } = req.body;

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
    res.json({ success: true, data: updated });
  } catch (err) {
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
    res.json({ success: true, data: { id, deleted: true } });
  } catch (err) {
    req.log.error({ err, contactId: req.params.id }, 'failed to delete contact');
    next(err);
  }
});

// ==========================================================
// GET /contacts/:id/history - Obtener historial de cambios
// ==========================================================
router.get('/:id/history', 
  requireAuth,
  validate({ 
    params: idParamSchema,
    query: historyQuerySchema 
  }),
  async (req: Request, res: Response, next: NextFunction) => {
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

// ==========================================================
// POST /contacts/webhook - Enviar contactos a webhook (proxy optimizado)
// ==========================================================

/**
 * Dividir array en lotes (batches)
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Retry con exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  logger?: { warn: (obj: unknown, msg: string) => void }
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger?.warn({ attempt: attempt + 1, maxRetries, delay, error }, 'Retrying webhook request');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

router.post('/webhook',
  requireAuth,
  webhookRateLimiter.middleware(),
  validate({ body: webhookExportSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Verificar si N8N está habilitado
    if (!env.N8N_ENABLED) {
      return res.status(503).json({
        success: false,
        error: 'N8N webhook service is disabled'
      });
    }

    try {
      const { webhookUrl, contacts, metadata } = req.body;

      // Validar tamaño de payload (máximo ~5MB)
      const payloadSize = JSON.stringify(contacts).length;
      const maxPayloadSize = 5 * 1024 * 1024; // 5MB
      
      if (payloadSize > maxPayloadSize) {
        req.log.warn({
          payloadSize,
          maxPayloadSize,
          contactsCount: contacts.length
        }, 'Payload too large, will use batching');
      }

      // Dividir en batches si es necesario
      const batchSize = env.N8N_WEBHOOK_BATCH_SIZE;
      const batches = contacts.length > batchSize 
        ? chunkArray(contacts, batchSize)
        : [contacts];

      req.log.info({
        userId,
        userRole,
        action: 'webhook_export',
        webhookUrl,
        contactsCount: contacts.length,
        batchesCount: batches.length,
        batchSize
      }, 'Iniciando envío de contactos a webhook');

      // Obtener cliente HTTP optimizado
      const httpClient = getHttpClient(req.log);

      // Enviar batches en paralelo (limitado por rate limit)
      const batchResults = await Promise.allSettled(
        batches.map(async (batch, batchIndex) => {
          const batchStartTime = Date.now();
          
          // Preparar payload para batch
          const payload = {
            contacts: batch,
            metadata: {
              total: contacts.length,
              batchIndex: batchIndex + 1,
              totalBatches: batches.length,
              exportedAt: new Date().toISOString(),
              filters: metadata?.filters ?? {
                stage: null,
                tags: [],
                search: null,
                advisorId: null
              }
            }
          };

          // Validar tamaño de payload del batch
          const batchPayloadSize = JSON.stringify(payload).length;
          if (batchPayloadSize > maxPayloadSize) {
            throw new Error(`Batch payload too large: ${batchPayloadSize} bytes`);
          }

          // Crear AbortController para timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, env.N8N_WEBHOOK_TIMEOUT);

          try {
            // Enviar con retry y exponential backoff
            const response = await retryWithBackoff(
              async () => {
                const result = await httpClient.post(webhookUrl, payload, {
                  signal: controller.signal
                });
                return result;
              },
              3, // max retries
              1000, // base delay 1s
              req.log
            );

            clearTimeout(timeoutId);
            const batchDuration = Date.now() - batchStartTime;

            if (response.status >= 200 && response.status < 300) {
              req.log.debug({
                webhookUrl,
                batchIndex: batchIndex + 1,
                batchSize: batch.length,
                status: response.status,
                duration: batchDuration
              }, 'Webhook batch sent successfully');

              return {
                success: true,
                batchIndex: batchIndex + 1,
                batchSize: batch.length,
                status: response.status
              };
            }

            // Manejar errores HTTP
            let parsedError: { code?: number; message?: string; hint?: string } | null = null;
            try {
              parsedError = JSON.parse(response.body);
            } catch {
              // Si no es JSON, usar el texto tal cual
            }

            let errorMessage = `Error al enviar batch: ${response.status} ${response.statusText}`;
            
            if (response.status === 404) {
              if (parsedError?.message?.includes('not registered')) {
                errorMessage = `El webhook de N8N no está activo. ${parsedError.hint || 'Asegúrate de que el workflow esté activo y el webhook esté configurado correctamente.'}`;
              } else if (parsedError?.message?.includes('not registered for POST')) {
                errorMessage = `El webhook de N8N está configurado para GET, pero necesitas POST. Verifica la configuración del webhook en N8N.`;
              } else {
                errorMessage = `El webhook de N8N no fue encontrado (404). Verifica que la URL sea correcta y que el workflow esté activo.`;
              }
            } else if (parsedError?.message) {
              errorMessage = `${parsedError.message}${parsedError.hint ? ` ${parsedError.hint}` : ''}`;
            }

            throw new Error(errorMessage);
          } catch (error: any) {
            clearTimeout(timeoutId);
            const batchDuration = Date.now() - batchStartTime;

            if (error.message === 'Request aborted' || error.name === 'AbortError') {
              req.log.error({
                webhookUrl,
                batchIndex: batchIndex + 1,
                duration: batchDuration,
                timeout: env.N8N_WEBHOOK_TIMEOUT
              }, 'Webhook batch timeout');
              throw new Error(`Timeout: El webhook no respondió en ${env.N8N_WEBHOOK_TIMEOUT}ms`);
            }

            // Detectar errores de conexión
            const isConnectionError =
              error.message?.includes('ECONNREFUSED') ||
              error.message?.includes('ETIMEDOUT') ||
              error.message?.includes('Request timeout') ||
              error.message?.includes('connect');

            if (isConnectionError) {
              req.log.error({
                webhookUrl,
                batchIndex: batchIndex + 1,
                error: error.message,
                duration: batchDuration
              }, 'Webhook batch connection error');
              throw new Error(`Error de conexión: ${error.message}. Verifica que el webhook esté corriendo y que la URL sea correcta.`);
            }

            req.log.error({
              webhookUrl,
              batchIndex: batchIndex + 1,
              error: error.message,
              duration: batchDuration
            }, 'Webhook batch request error');

            throw error;
          }
        })
      );

      const duration = Date.now() - startTime;

      // Analizar resultados
      const successful = batchResults.filter(r => r.status === 'fulfilled').length;
      const failed = batchResults.filter(r => r.status === 'rejected').length;
      const errors = batchResults
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason?.message || 'Unknown error');

      if (failed > 0) {
        req.log.error({
          webhookUrl,
          contactsCount: contacts.length,
          batchesCount: batches.length,
          successful,
          failed,
          errors,
          duration
        }, 'Webhook export partially failed');

        return res.status(207).json({
          success: false,
          error: `Se enviaron ${successful} de ${batches.length} batches exitosamente`,
          details: {
            successful,
            failed,
            total: batches.length,
            errors: errors.slice(0, 3) // Limitar a 3 errores para no saturar respuesta
          }
        });
      }

      req.log.info({
        webhookUrl,
        contactsCount: contacts.length,
        batchesCount: batches.length,
        duration
      }, 'Webhook export successful');

      return res.json({
        success: true,
        data: {
          success: true,
          message: `Se enviaron ${contacts.length} contactos exitosamente al webhook${batches.length > 1 ? ` en ${batches.length} batches` : ''}`,
          batchesCount: batches.length,
          contactsCount: contacts.length
        }
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      req.log.error({
        err,
        userId,
        userRole,
        duration,
        action: 'webhook_export'
      }, 'Error en webhook export');
      next(err);
    }
  }
);

export default router;

