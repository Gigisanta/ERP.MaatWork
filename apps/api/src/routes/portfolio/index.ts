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
router.get('/templates', requireAuth, requireRole(['admin', 'manager']), listTemplates);

// POST /portfolios/templates - Crear plantilla
router.post(
  '/templates',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ body: createPortfolioSchema }),
  createTemplate
);

// GET /portfolios/templates/lines/batch - Obtener líneas en batch (DEBE ir antes de :id)
router.get(
  '/templates/lines/batch',
  requireAuth,
  requireRole(['admin', 'manager']),
  getTemplateLinesBatch
);

// GET /portfolios/templates/:id - Obtener plantilla por ID
router.get(
  '/templates/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema }),
  getTemplateById
);

// PUT /portfolios/templates/:id - Actualizar plantilla
router.put(
  '/templates/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema, body: updatePortfolioSchema }),
  updateTemplate
);

// GET /portfolios/templates/:id/lines - Obtener líneas de plantilla
router.get(
  '/templates/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema }),
  getTemplateLines
);

// POST /portfolios/templates/:id/lines - Agregar línea a plantilla
router.post(
  '/templates/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: templateIdParamSchema, body: addPortfolioLineSchema }),
  addTemplateLine
);

// DELETE /portfolios/templates/:id/lines/:lineId - Eliminar línea de plantilla
router.delete(
  '/templates/:id/lines/:lineId',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: lineIdParamSchema }),
  deleteTemplateLine
);

// ==========================================================
// Portfolio Assignments
// ==========================================================

// GET /portfolios/assignments - Listar asignaciones
router.get('/assignments', requireAuth, requireContactAccess, listAssignments);

// POST /portfolios/assignments - Crear asignación
router.post(
  '/assignments',
  requireAuth,
  validate({ body: createAssignmentSchema }),
  requireContactAccess,
  createAssignment
);

// GET /contacts/:id/portfolio - Obtener cartera activa de contacto
router.get('/contacts/:id/portfolio', requireAuth, requireContactAccess, getContactPortfolio);

// PUT /portfolios/assignments/:id/overrides - Actualizar overrides
router.put('/assignments/:id/overrides', requireAuth, updateAssignmentOverrides);

// PATCH /portfolios/assignments/:id - Actualizar estado
router.patch(
  '/assignments/:id',
  requireAuth,
  validate({ params: assignmentIdParamSchema, body: updateAssignmentStatusSchema }),
  updateAssignmentStatus
);

// DELETE /portfolios/assignments/:id - Eliminar asignación
router.delete(
  '/assignments/:id',
  requireAuth,
  validate({ params: assignmentIdParamSchema }),
  deleteAssignment
);

export default router;
