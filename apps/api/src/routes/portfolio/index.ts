/**
 * Portfolio Routes
 *
 * AI_DECISION: Refactorizado desde archivo monolítico (914 líneas) a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, dividido en:
 *   - schemas.ts: Validaciones Zod
 *   - handlers/templates.ts: CRUD de plantillas
 *   - handlers/template-lines.ts: Líneas de plantillas
 *   - handlers/assignments.ts: Asignaciones de carteras
 *
 * REGLA CURSOR: Portfolios - mantener RBAC, validaciones, logging estructurado, no romper API sin versioning
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { requireContactAccess } from '../../middleware/contact-access';
import { createRouteHandler, createAsyncHandler } from '../../utils/route-handler';

// Schemas
import {
  createPortfolioSchema,
  updatePortfolioSchema,
  addPortfolioLineSchema,
  templateIdParamSchema,
  lineIdParamSchema,
  createAssignmentSchema,
  updateAssignmentStatusSchema,
  assignmentIdParamSchema,
} from './schemas';

// Handlers
import {
  listTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  getTemplateLinesBatch,
} from './handlers/templates';
import { getTemplateLines, addTemplateLine, deleteTemplateLine } from './handlers/template-lines';
import {
  listAssignments,
  createAssignment,
  getContactPortfolio,
  updateAssignmentOverrides,
  updateAssignmentStatus,
  deleteAssignment,
} from './handlers/assignments';

const router = Router();

// ==========================================================
// Portfolio Templates CRUD
// ==========================================================

// GET /portfolios/templates - Listar plantillas
router.get(
  '/templates',
  requireAuth,
  requireRole(['admin', 'manager']),
  createRouteHandler(listTemplates)
);

// POST /portfolios/templates - Crear plantilla
// AI_DECISION: Usar createAsyncHandler para manejar status 201 (Created)
// Justificación: createRouteHandler siempre retorna 200, pero POST debe retornar 201
// Impacto: Respuesta HTTP correcta según estándares REST
router.post(
  '/templates',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ body: createPortfolioSchema }),
  createAsyncHandler(async (req, res) => {
    const result = await createTemplate(req);
    return res.status(201).json({ success: true, data: result, requestId: req.requestId });
  })
);

// GET /portfolios/templates/lines/batch - Obtener líneas en batch (DEBE ir antes de :id)
router.get(
  '/templates/lines/batch',
  requireAuth,
  requireRole(['admin', 'manager']),
  createRouteHandler(getTemplateLinesBatch)
);

// GET /portfolios/templates/:id - Obtener plantilla por ID
router.get(
  '/templates/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema }),
  createRouteHandler(getTemplateById)
);

// PUT /portfolios/templates/:id - Actualizar plantilla
router.put(
  '/templates/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema, body: updatePortfolioSchema }),
  createRouteHandler(updateTemplate)
);

// GET /portfolios/templates/:id/lines - Obtener líneas de plantilla
router.get(
  '/templates/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema }),
  createRouteHandler(getTemplateLines)
);

// POST /portfolios/templates/:id/lines - Agregar línea a plantilla
// AI_DECISION: Usar createAsyncHandler para manejar status 201 (Created)
// Justificación: createRouteHandler siempre retorna 200, pero POST debe retornar 201
// Impacto: Respuesta HTTP correcta según estándares REST
router.post(
  '/templates/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema, body: addPortfolioLineSchema }),
  createAsyncHandler(async (req, res) => {
    const result = await addTemplateLine(req);
    return res.status(201).json({ success: true, data: result, requestId: req.requestId });
  })
);

// DELETE /portfolios/templates/:id/lines/:lineId - Eliminar línea de plantilla
router.delete(
  '/templates/:id/lines/:lineId',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: lineIdParamSchema }),
  createRouteHandler(deleteTemplateLine)
);

// ==========================================================
// Portfolio Assignments
// ==========================================================

// GET /portfolios/assignments - Listar asignaciones
router.get(
  '/assignments',
  requireAuth,
  requireContactAccess,
  createRouteHandler(listAssignments)
);

// POST /portfolios/assignments - Crear asignación
// AI_DECISION: Usar createAsyncHandler para manejar status 201 (Created)
// Justificación: createRouteHandler siempre retorna 200, pero POST debe retornar 201
// Impacto: Respuesta HTTP correcta según estándares REST
router.post(
  '/assignments',
  requireAuth,
  validate({ body: createAssignmentSchema }),
  requireContactAccess,
  createAsyncHandler(async (req, res) => {
    const result = await createAssignment(req);
    return res.status(201).json({ success: true, data: result, requestId: req.requestId });
  })
);

// GET /contacts/:id/portfolio - Obtener cartera activa de contacto
router.get(
  '/contacts/:id/portfolio',
  requireAuth,
  requireContactAccess,
  createRouteHandler(getContactPortfolio)
);

// PUT /portfolios/assignments/:id/overrides - Actualizar overrides
router.put(
  '/assignments/:id/overrides',
  requireAuth,
  createRouteHandler(updateAssignmentOverrides)
);

// PATCH /portfolios/assignments/:id - Actualizar estado
router.patch(
  '/assignments/:id',
  requireAuth,
  validate({ params: assignmentIdParamSchema, body: updateAssignmentStatusSchema }),
  createRouteHandler(updateAssignmentStatus)
);

// DELETE /portfolios/assignments/:id - Eliminar asignación
router.delete(
  '/assignments/:id',
  requireAuth,
  validate({ params: assignmentIdParamSchema }),
  createRouteHandler(deleteAssignment)
);

export default router;






