// REGLA CURSOR: Portfolios - mantener RBAC, validaciones, logging estructurado, no romper API sin versioning
import { Router } from 'express';
import { db } from '@cactus/db';
import { 
  portfolioTemplates, 
  portfolioTemplateLines, 
  clientPortfolioAssignments, 
  clientPortfolioOverrides,
  contacts,
  instruments,
  lookupAssetClass
} from '@cactus/db/schema';
import { eq, and, sql, desc, asc, type InferSelectModel } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { getUserAccessScope } from '../auth/authorization';
import { UserRole } from '../auth/types';
import { validate } from '../utils/validation';
import { z } from 'zod';
import { uuidSchema } from '../utils/common-schemas';

const router = Router();

// ==========================================================
// Zod Validation Schemas
// ==========================================================

const riskLevelSchema = z.enum(['conservative', 'moderate', 'aggressive']);

const portfolioAssignmentStatusSchema = z.enum(['active', 'paused', 'ended']);

const createPortfolioSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(255, 'Nombre demasiado largo'),
  description: z.string().max(1000, 'Descripción demasiado larga').optional().nullable(),
  riskLevel: riskLevelSchema
});

const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  riskLevel: riskLevelSchema.optional()
});

const addPortfolioLineSchema = z.object({
  targetType: z.enum(['instrument', 'assetClass']),
  instrumentId: uuidSchema.optional(),
  assetClass: z.string().optional(),
  targetWeight: z.number().min(0, 'El peso debe ser mayor o igual a 0').max(1, 'El peso debe ser menor o igual a 1')
}).refine(
  (data) => {
    if (data.targetType === 'instrument' && !data.instrumentId) {
      return false;
    }
    if (data.targetType === 'assetClass' && !data.assetClass) {
      return false;
    }
    return true;
  },
  {
    message: 'instrumentId es requerido para tipo instrument, assetClass es requerido para tipo assetClass'
  }
);

const templateIdParamSchema = z.object({
  id: uuidSchema
});

const lineIdParamSchema = z.object({
  id: uuidSchema,
  lineId: uuidSchema
});

const createAssignmentSchema = z.object({
  contactId: uuidSchema,
  templateId: uuidSchema,
  startDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    'Invalid ISO date format'
  ),
  notes: z.string().optional().nullable()
});

const updateAssignmentStatusSchema = z.object({
  status: portfolioAssignmentStatusSchema
});

const assignmentIdParamSchema = z.object({
  id: uuidSchema
});

// ==========================================================
// Portfolio Templates CRUD
// ==========================================================

/**
 * GET /portfolios/templates
 * Listar plantillas de carteras con conteo de clientes asignados
 */
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden ver todas las plantillas
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const templates = await db()
      .select({
        id: portfolioTemplates.id,
        name: portfolioTemplates.name,
        description: portfolioTemplates.description,
        riskLevel: portfolioTemplates.riskLevel,
        createdAt: portfolioTemplates.createdAt,
        clientCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${clientPortfolioAssignments} 
          WHERE ${clientPortfolioAssignments.templateId} = ${portfolioTemplates.id}
          AND ${clientPortfolioAssignments.status} = 'active'
        )`
      })
      .from(portfolioTemplates)
      .orderBy(desc(portfolioTemplates.createdAt));

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio templates');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /portfolios/templates
 * Crear nueva plantilla de cartera
 */
router.post('/templates',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({
    body: createPortfolioSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden crear plantillas
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { name, description, riskLevel } = req.body;

    const [template] = await db()
      .insert(portfolioTemplates)
      .values({
        name,
        description,
        riskLevel,
        createdByUserId: userId
      })
      .returning();

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error creating portfolio template');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /portfolios/templates/:id
 * Obtener plantilla de cartera por ID con líneas
 */
router.get('/templates/:id',
  requireAuth,
  validate({
    params: templateIdParamSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const templateId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden ver plantillas
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Obtener template
    const [template] = await db()
      .select({
        id: portfolioTemplates.id,
        name: portfolioTemplates.name,
        description: portfolioTemplates.description,
        riskLevel: portfolioTemplates.riskLevel,
        createdAt: portfolioTemplates.createdAt
      })
      .from(portfolioTemplates)
      .where(eq(portfolioTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    // Obtener líneas del template
    const lines = await db()
      .select({
        id: portfolioTemplateLines.id,
        targetType: portfolioTemplateLines.targetType,
        assetClass: portfolioTemplateLines.assetClass,
        instrumentId: portfolioTemplateLines.instrumentId,
        targetWeight: portfolioTemplateLines.targetWeight,
        instrumentName: instruments.name,
        instrumentSymbol: instruments.symbol,
        assetClassName: lookupAssetClass.label
      })
      .from(portfolioTemplateLines)
      .leftJoin(instruments, eq(portfolioTemplateLines.instrumentId, instruments.id))
      .leftJoin(lookupAssetClass, eq(portfolioTemplateLines.assetClass, lookupAssetClass.id))
      .where(eq(portfolioTemplateLines.templateId, templateId))
      .orderBy(asc(portfolioTemplateLines.targetType), asc(portfolioTemplateLines.targetWeight));

    // Calcular suma de pesos
    type LineWithWeight = {
      targetWeight: string | number;
    };
    const totalWeight = lines.reduce((sum: number, line: LineWithWeight) => sum + Number(line.targetWeight), 0);
    const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

    res.json({
      success: true,
      data: {
        ...template,
        lines,
        totalWeight,
        isValid
      }
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio template by ID');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /portfolios/templates/:id
 * Actualizar plantilla de cartera
 */
router.put('/templates/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({
    params: templateIdParamSchema,
    body: updatePortfolioSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const templateId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden editar plantillas
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { name, description, riskLevel } = req.body;

    const [updatedTemplate] = await db()
      .update(portfolioTemplates)
      .set({
        name,
        description,
        riskLevel
      })
      .where(eq(portfolioTemplates.id, templateId))
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json({
      success: true,
      data: updatedTemplate
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error updating portfolio template');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /portfolios/templates/lines/batch
 * Obtener líneas de múltiples plantillas (batch)
 * Query params: ids=id1,id2,id3
 */
router.get('/templates/lines/batch', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // AI_DECISION: Validación robusta de IDs en batch endpoint
    // Justificación: Prevenir DoS, validar formato UUID, eliminar duplicados
    // Impacto: Seguridad mejorada, mejor manejo de errores
    const { validateBatchIds, BATCH_LIMITS } = await import('../utils/batch-validation');
    
    const validation = validateBatchIds(req.query.ids as string, {
      maxCount: BATCH_LIMITS.MAX_PORTFOLIOS,
      requireUuid: true,
      fieldName: 'ids'
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid batch request',
        details: validation.errors
      });
    }

    const templateIds = validation.ids;

    // Obtener todas las líneas de todos los portfolios en una sola query
    const allLines = await db()
      .select({
        lineId: portfolioTemplateLines.id,
        templateId: portfolioTemplateLines.templateId,
        targetType: portfolioTemplateLines.targetType,
        assetClass: portfolioTemplateLines.assetClass,
        instrumentId: portfolioTemplateLines.instrumentId,
        targetWeight: portfolioTemplateLines.targetWeight,
        instrumentSymbol: instruments.symbol,
        instrumentName: instruments.name,
        assetClassName: lookupAssetClass.name
      })
      .from(portfolioTemplateLines)
      .leftJoin(instruments, eq(portfolioTemplateLines.instrumentId, instruments.id))
      .leftJoin(lookupAssetClass, eq(portfolioTemplateLines.assetClass, lookupAssetClass.id))
      .where(sql`${portfolioTemplateLines.templateId} = ANY(${templateIds})`);

    // Agrupar líneas por templateId
    const linesByTemplate: Record<string, any[]> = {};
    templateIds.forEach(id => {
      linesByTemplate[id] = [];
    });

    type PortfolioLineWithMetadata = {
      lineId: string;
      templateId: string;
      targetType: string;
      assetClass: string | null;
      instrumentId: string | null;
      targetWeight: string | number;
      instrumentSymbol: string | null;
      instrumentName: string | null;
      assetClassName: string | null;
    };
    
    allLines.forEach((line: PortfolioLineWithMetadata) => {
      if (linesByTemplate[line.templateId]) {
        linesByTemplate[line.templateId].push({
          id: line.lineId,
          targetType: line.targetType,
          assetClass: line.assetClass,
          instrumentId: line.instrumentId,
          targetWeight: line.targetWeight,
          instrumentSymbol: line.instrumentSymbol,
          instrumentName: line.instrumentName,
          assetClassName: line.assetClassName
        });
      }
    });

    res.json({
      success: true,
      data: linesByTemplate
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching template lines batch');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /portfolios/templates/:id/lines
 * Obtener composición de una plantilla
 */
router.get('/templates/:id/lines',
  requireAuth,
  validate({
    params: templateIdParamSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const templateId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden ver composición
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const lines = await db()
      .select({
        id: portfolioTemplateLines.id,
        targetType: portfolioTemplateLines.targetType,
        assetClass: portfolioTemplateLines.assetClass,
        instrumentId: portfolioTemplateLines.instrumentId,
        targetWeight: portfolioTemplateLines.targetWeight,
        instrumentName: instruments.name,
        instrumentSymbol: instruments.symbol,
        assetClassName: lookupAssetClass.label
      })
      .from(portfolioTemplateLines)
      .leftJoin(instruments, eq(portfolioTemplateLines.instrumentId, instruments.id))
      .leftJoin(lookupAssetClass, eq(portfolioTemplateLines.assetClass, lookupAssetClass.id))
      .where(eq(portfolioTemplateLines.templateId, templateId))
      .orderBy(asc(portfolioTemplateLines.targetType), asc(portfolioTemplateLines.targetWeight));

    // Calcular suma de pesos para validación
      type LineWithWeight = {
        targetWeight: string | number;
      };
      const totalWeight = lines.reduce((sum: number, line: LineWithWeight) => sum + Number(line.targetWeight), 0);

    res.json({
      success: true,
      data: {
        lines,
        totalWeight,
        isValid: Math.abs(totalWeight - 1.0) < 0.0001 // Tolerancia para decimales
      }
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio template lines');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /portfolios/templates/:id/lines
 * Agregar línea a plantilla
 */
router.post('/templates/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({
    params: templateIdParamSchema,
    body: addPortfolioLineSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const templateId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden editar composición
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { targetType, assetClass, instrumentId, targetWeight } = req.body;
    const weight = Number(targetWeight);

    // Verificar que la suma de pesos no exceda 1.0
    const existingLines = await db()
      .select({ weight: portfolioTemplateLines.targetWeight })
      .from(portfolioTemplateLines)
      .where(eq(portfolioTemplateLines.templateId, templateId));

    type ExistingLineWithWeight = {
      weight: string;
    };
    const currentTotal = existingLines.reduce((sum: number, line: ExistingLineWithWeight) => sum + Number(line.weight), 0);
    if (currentTotal + weight > 1.0) {
      return res.status(400).json({ 
        error: `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weight * 100).toFixed(2)}%` 
      });
    }

    const [line] = await db()
      .insert(portfolioTemplateLines)
      .values({
        templateId,
        targetType,
        assetClass,
        instrumentId,
        targetWeight: weight
      })
      .returning();

    res.status(201).json({
      success: true,
      data: line
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error adding portfolio template line');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /portfolios/templates/:id/lines/:lineId
 * Eliminar línea de plantilla
 */
router.delete('/templates/:id/lines/:lineId',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({
    params: lineIdParamSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const { id: templateId, lineId } = req.params;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin y managers pueden editar composición
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    await db()
      .delete(portfolioTemplateLines)
      .where(and(
        eq(portfolioTemplateLines.id, lineId),
        eq(portfolioTemplateLines.templateId, templateId)
      ));

    res.json({
      success: true,
      message: 'Línea eliminada correctamente'
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error deleting portfolio template line');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================================
// Portfolio Assignments
// ==========================================================

/**
 * GET /portfolios/assignments
 * Listar asignaciones de carteras por contacto
 */
router.get('/assignments', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const { contactId } = req.query;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    // Verificar acceso al contacto
    const accessScope = await getUserAccessScope(userId, role);
    const canAccess = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, contactId as string),
        role === 'admin' ? sql`1=1` :
        role === 'manager' ? 
          sql`${contacts.assignedAdvisorId} = ANY(${accessScope.accessibleAdvisorIds})` :
          eq(contacts.assignedAdvisorId, userId)
      ))
      .limit(1);

    if (canAccess.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }

    // Obtener asignaciones con información de la plantilla
    const assignments = await db()
      .select({
        id: clientPortfolioAssignments.id,
        contactId: clientPortfolioAssignments.contactId,
        templateId: clientPortfolioAssignments.templateId,
        templateName: portfolioTemplates.name,
        status: clientPortfolioAssignments.status,
        startDate: clientPortfolioAssignments.startDate,
        endDate: clientPortfolioAssignments.endDate,
        notes: clientPortfolioAssignments.notes,
        createdAt: clientPortfolioAssignments.createdAt
      })
      .from(clientPortfolioAssignments)
      .leftJoin(portfolioTemplates, eq(clientPortfolioAssignments.templateId, portfolioTemplates.id))
      .where(eq(clientPortfolioAssignments.contactId, contactId as string))
      .orderBy(desc(clientPortfolioAssignments.createdAt));

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching portfolio assignments');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /portfolios/assignments
 * Asignar cartera a contacto
 */
router.post('/assignments',
  requireAuth,
  validate({
    body: createAssignmentSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { contactId, templateId, startDate, notes } = req.body;

    // Verificar acceso al contacto
    const accessScope = await getUserAccessScope(userId, role);
    const canAccess = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, contactId),
        // Aplicar filtros de acceso según rol
        role === 'admin' ? sql`1=1` :
        role === 'manager' ? 
          sql`${contacts.assignedAdvisorId} = ANY(${accessScope.accessibleAdvisorIds})` :
          eq(contacts.assignedAdvisorId, userId)
      ))
      .limit(1);

    if (canAccess.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }

    // Verificar que la plantilla existe
    const template = await db()
      .select({ id: portfolioTemplates.id })
      .from(portfolioTemplates)
      .where(eq(portfolioTemplates.id, templateId))
      .limit(1);

    if (template.length === 0) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    // Desactivar asignaciones previas del contacto
    await db()
      .update(clientPortfolioAssignments)
      .set({ status: 'ended' })
      .where(and(
        eq(clientPortfolioAssignments.contactId, contactId),
        eq(clientPortfolioAssignments.status, 'active')
      ));

    // Crear nueva asignación
    const [assignment] = await db()
      .insert(clientPortfolioAssignments)
      .values({
        contactId,
        templateId,
        status: 'active',
        startDate,
        notes,
        createdByUserId: userId
      })
      .returning();

    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error assigning portfolio');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /contacts/:id/portfolio
 * Obtener cartera activa de un contacto
 */
router.get('/contacts/:id/portfolio', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const contactId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar acceso al contacto
    const accessScope = await getUserAccessScope(userId, role);
    const canAccess = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, contactId),
        // Aplicar filtros de acceso según rol
        role === 'admin' ? sql`1=1` :
        role === 'manager' ? 
          sql`${contacts.assignedAdvisorId} = ANY(${accessScope.accessibleAdvisorIds})` :
          eq(contacts.assignedAdvisorId, userId)
      ))
      .limit(1);

    if (canAccess.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }

    // Obtener asignación activa
    const assignment = await db()
      .select({
        id: clientPortfolioAssignments.id,
        templateId: clientPortfolioAssignments.templateId,
        status: clientPortfolioAssignments.status,
        startDate: clientPortfolioAssignments.startDate,
        endDate: clientPortfolioAssignments.endDate,
        notes: clientPortfolioAssignments.notes,
        templateName: portfolioTemplates.name,
        templateDescription: portfolioTemplates.description,
        riskLevel: portfolioTemplates.riskLevel
      })
      .from(clientPortfolioAssignments)
      .innerJoin(portfolioTemplates, eq(clientPortfolioAssignments.templateId, portfolioTemplates.id))
      .where(and(
        eq(clientPortfolioAssignments.contactId, contactId),
        eq(clientPortfolioAssignments.status, 'active')
      ))
      .limit(1);

    if (assignment.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No hay cartera asignada'
      });
    }

    // AI_DECISION: Parallelize queries to reduce total response time
    // Justificación: templateLines and overrides queries are independent, running in parallel reduces latency by 30-50%
    // Impacto: Faster portfolio loading, better UX
    const [templateLines, overrides] = await Promise.all([
      db()
        .select({
          id: portfolioTemplateLines.id,
          targetType: portfolioTemplateLines.targetType,
          assetClass: portfolioTemplateLines.assetClass,
          instrumentId: portfolioTemplateLines.instrumentId,
          targetWeight: portfolioTemplateLines.targetWeight,
          instrumentName: instruments.name,
          instrumentSymbol: instruments.symbol,
          assetClassName: lookupAssetClass.label
        })
        .from(portfolioTemplateLines)
        .leftJoin(instruments, eq(portfolioTemplateLines.instrumentId, instruments.id))
        .leftJoin(lookupAssetClass, eq(portfolioTemplateLines.assetClass, lookupAssetClass.id))
        .where(eq(portfolioTemplateLines.templateId, assignment[0].templateId))
        .orderBy(asc(portfolioTemplateLines.targetType), asc(portfolioTemplateLines.targetWeight)),
      db()
        .select({
          id: clientPortfolioOverrides.id,
          targetType: clientPortfolioOverrides.targetType,
          assetClass: clientPortfolioOverrides.assetClass,
          instrumentId: clientPortfolioOverrides.instrumentId,
          targetWeight: clientPortfolioOverrides.targetWeight
        })
        .from(clientPortfolioOverrides)
        .where(eq(clientPortfolioOverrides.assignmentId, assignment[0].id))
    ]);

    res.json({
      success: true,
      data: {
        assignment: assignment[0],
        templateLines,
        overrides
      }
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error fetching contact portfolio');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /portfolios/assignments/:id/overrides
 * Actualizar overrides de asignación
 */
router.put('/assignments/:id/overrides', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const assignmentId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { overrides } = req.body;

    if (!Array.isArray(overrides)) {
      return res.status(400).json({ error: 'Overrides debe ser un array' });
    }

    // Verificar acceso a la asignación
    const assignment = await db()
      .select({
        id: clientPortfolioAssignments.id,
        contactId: clientPortfolioAssignments.contactId,
        templateId: clientPortfolioAssignments.templateId
      })
      .from(clientPortfolioAssignments)
      .where(eq(clientPortfolioAssignments.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    // Verificar acceso al contacto
    const accessScope = await getUserAccessScope(userId, role);
    const canAccess = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, assignment[0].contactId),
        // Aplicar filtros de acceso según rol
        role === 'admin' ? sql`1=1` :
        role === 'manager' ? 
          sql`${contacts.assignedAdvisorId} = ANY(${accessScope.accessibleAdvisorIds})` :
          eq(contacts.assignedAdvisorId, userId)
      ))
      .limit(1);

    if (canAccess.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }

    // Eliminar overrides existentes
    await db()
      .delete(clientPortfolioOverrides)
      .where(eq(clientPortfolioOverrides.assignmentId, assignmentId));

    // Insertar nuevos overrides
    if (overrides.length > 0) {
      await db()
        .insert(clientPortfolioOverrides)
        .values(overrides.map(override => ({
          assignmentId,
          targetType: override.targetType,
          assetClass: override.assetClass,
          instrumentId: override.instrumentId,
          targetWeight: override.targetWeight
        })));
    }

    res.json({
      success: true,
      message: 'Overrides actualizados correctamente'
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error updating portfolio overrides');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PATCH /portfolios/assignments/:id
 * Actualizar estado de asignación de portfolio
 */
router.patch('/assignments/:id', 
  requireAuth,
  validate({
    params: assignmentIdParamSchema,
    body: updateAssignmentStatusSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const assignmentId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { status } = req.body;

    // Verificar acceso a la asignación
    const assignment = await db()
      .select({
        id: clientPortfolioAssignments.id,
        contactId: clientPortfolioAssignments.contactId,
        templateId: clientPortfolioAssignments.templateId
      })
      .from(clientPortfolioAssignments)
      .where(eq(clientPortfolioAssignments.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    // Verificar acceso al contacto
    const accessScope = await getUserAccessScope(userId, role);
    const canAccess = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, assignment[0].contactId),
        role === 'admin' ? sql`1=1` :
        role === 'manager' ? 
          sql`${contacts.assignedAdvisorId} = ANY(${accessScope.accessibleAdvisorIds})` :
          eq(contacts.assignedAdvisorId, userId)
      ))
      .limit(1);

    if (canAccess.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }

    // Actualizar estado
    const [updated] = await db()
      .update(clientPortfolioAssignments)
      .set({ 
        status,
        ...(status === 'ended' ? { endDate: new Date() } : {})
      })
      .where(eq(clientPortfolioAssignments.id, assignmentId))
      .returning();

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error updating portfolio assignment status');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /portfolios/assignments/:id
 * Eliminar asignación de portfolio (soft delete marcando como ended)
 */
router.delete('/assignments/:id',
  requireAuth,
  validate({
    params: assignmentIdParamSchema
  }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const assignmentId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar acceso a la asignación
    const assignment = await db()
      .select({
        id: clientPortfolioAssignments.id,
        contactId: clientPortfolioAssignments.contactId,
        templateId: clientPortfolioAssignments.templateId
      })
      .from(clientPortfolioAssignments)
      .where(eq(clientPortfolioAssignments.id, assignmentId))
      .limit(1);

    if (assignment.length === 0) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    // Verificar acceso al contacto
    const accessScope = await getUserAccessScope(userId, role);
    const canAccess = await db()
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, assignment[0].contactId),
        role === 'admin' ? sql`1=1` :
        role === 'manager' ? 
          sql`${contacts.assignedAdvisorId} = ANY(${accessScope.accessibleAdvisorIds})` :
          eq(contacts.assignedAdvisorId, userId)
      ))
      .limit(1);

    if (canAccess.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }

    // Soft delete: marcar como ended
    await db()
      .update(clientPortfolioAssignments)
      .set({ 
        status: 'ended',
        endDate: new Date()
      })
      .where(eq(clientPortfolioAssignments.id, assignmentId));

    res.json({
      success: true,
      message: 'Asignación eliminada correctamente'
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error deleting portfolio assignment');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
