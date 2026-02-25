/**
 * Portfolio Routes
 *
 * AI_DECISION: Refactorizado desde archivo monolítico (914 líneas) a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, dividido en:
 *   - schemas.ts: Validaciones Zod
 *   - handlers/portfolios.ts: CRUD de portfolios (templates/benchmarks)
 *   - handlers/portfolio-lines.ts: Líneas de portfolios
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
  portfolioIdParamSchema,
  lineIdParamSchema,
  createAssignmentSchema,
  updateAssignmentStatusSchema,
  assignmentIdParamSchema,
} from './schemas';

// Handlers
import {
  listPortfolios,
  createPortfolio,
  getPortfolioById,
  updatePortfolio,
  deletePortfolio,
  getPortfolioLinesBatch,
} from './handlers/portfolios';
import {
  getPortfolioLines,
  addPortfolioLine,
  deletePortfolioLine,
} from './handlers/portfolio-lines';
import {
  listAssignments,
  createAssignment,
  getContactPortfolio,
  updateAssignmentOverrides,
  updateAssignmentStatus,
  deleteAssignment,
} from './handlers/assignments';
import { getPortfolioStats } from './handlers/stats';

import { rateLimit } from '../../middleware/rate-limit';
import { cache } from '../../middleware/cache';

const router = Router();

// ==========================================================
// Portfolios CRUD
// ==========================================================

// GET /portfolios - Listar portfolios
router.get(
  '/',
  requireAuth,
  requireRole(['admin', 'manager']),
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  cache({ ttl: 60, keyPrefix: 'portfolios:list' }),
  createRouteHandler(listPortfolios)
);

// POST /portfolios - Crear portfolio
// AI_DECISION: Usar createAsyncHandler para manejar status 201 (Created)
// Justificación: createRouteHandler siempre retorna 200, pero POST debe retornar 201
// Impacto: Respuesta HTTP correcta según estándares REST
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ body: createPortfolioSchema }),
  createAsyncHandler(async (req, res) => {
    const result = await createPortfolio(req);
    return res.status(201).json({ success: true, data: result, requestId: req.requestId });
  })
);

// GET /portfolios/lines/batch - Obtener líneas en batch (DEBE ir antes de :id)
router.get(
  '/lines/batch',
  requireAuth,
  requireRole(['admin', 'manager']),
  createRouteHandler(getPortfolioLinesBatch)
);

// GET /portfolios/:id - Obtener portfolio por ID
router.get(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: portfolioIdParamSchema }),
  cache({ ttl: 300, keyPrefix: 'portfolios:detail' }),
  createRouteHandler(getPortfolioById)
);

// PUT /portfolios/:id - Actualizar portfolio
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: portfolioIdParamSchema, body: updatePortfolioSchema }),
  createRouteHandler(updatePortfolio)
);

// DELETE /portfolios/:id - Eliminar portfolio (Soft Delete)
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: portfolioIdParamSchema }),
  createRouteHandler(deletePortfolio)
);

// GET /portfolios/:id/lines - Obtener líneas de portfolio
router.get(
  '/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: portfolioIdParamSchema }),
  createRouteHandler(getPortfolioLines)
);

// POST /portfolios/:id/lines - Agregar línea a portfolio
// AI_DECISION: Usar createAsyncHandler para manejar status 201 (Created)
// Justificación: createRouteHandler siempre retorna 200, pero POST debe retornar 201
// Impacto: Respuesta HTTP correcta según estándares REST
router.post(
  '/:id/lines',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: portfolioIdParamSchema, body: addPortfolioLineSchema }),
  createAsyncHandler(async (req, res) => {
    const result = await addPortfolioLine(req);
    return res.status(201).json({ success: true, data: result, requestId: req.requestId });
  })
);

// DELETE /portfolios/:id/lines/:lineId - Eliminar línea de portfolio
router.delete(
  '/:id/lines/:lineId',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: lineIdParamSchema }),
  createRouteHandler(deletePortfolioLine)
);

// GET /portfolios/:id/stats - Obtener estadísticas de portfolio
router.get(
  '/:id/stats',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: portfolioIdParamSchema }),
  cache({ ttl: 60, keyPrefix: 'portfolios:stats' }),
  createRouteHandler(getPortfolioStats)
);

// ==========================================================
// Portfolio Assignments
// ==========================================================

// GET /portfolios/assignments - Listar asignaciones
router.get('/assignments', requireAuth, requireContactAccess, createRouteHandler(listAssignments));

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
