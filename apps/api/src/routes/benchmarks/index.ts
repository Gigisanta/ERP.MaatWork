/**
 * Benchmarks Routes
 *
 * AI_DECISION: Modularizar endpoints de benchmarks en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { idParamSchema, uuidSchema } from '../../utils/validation/common-schemas';
import { cache } from '../../middleware/cache';
import { REDIS_TTL } from '../../config/redis';
import { buildCacheKey } from '../../config/redis';

// Import handlers
import { handleListBenchmarks } from './handlers/list';
import { handleGetBenchmark } from './handlers/get';
import { handleBatchComponents } from './handlers/batch';
import {
  handleCreateBenchmark,
  handleUpdateBenchmark,
  handleDeleteBenchmark,
} from './handlers/crud';
import {
  handleAddComponent,
  handleUpdateComponent,
  handleDeleteComponent,
} from './handlers/components';
import { handleAvailableInstruments } from './handlers/instruments';
import {
  createBenchmarkSchema,
  updateBenchmarkSchema,
  addComponentSchema,
  updateComponentSchema,
} from './schemas';

const router = Router();

// ==========================================================
// Benchmarks CRUD
// ==========================================================

/**
 * GET /benchmarks
 * Listar benchmarks disponibles
 */
router.get(
  '/',
  requireAuth,
  cache({
    ttl: REDIS_TTL.BENCHMARKS,
    keyPrefix: 'benchmarks',
    keyBuilder: (req) => {
      const userId = req.user?.id || 'anonymous';
      return buildCacheKey('benchmarks', userId);
    },
  }),
  handleListBenchmarks
);

/**
 * GET /benchmarks/components/batch
 * Obtener componentes de múltiples benchmarks (batch)
 * Query params: ids=id1,id2,id3
 */
router.get(
  '/components/batch',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  handleBatchComponents
);

/**
 * GET /benchmarks/instruments/available
 * Listar instrumentos disponibles para agregar a benchmarks
 */
router.get('/instruments/available', requireAuth, handleAvailableInstruments);

/**
 * GET /benchmarks/:id
 * Obtener benchmark específico con sus componentes
 */
router.get('/:id', requireAuth, validate({ params: idParamSchema }), handleGetBenchmark);

/**
 * POST /benchmarks
 * Crear benchmark custom (solo admin)
 */
router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createBenchmarkSchema }),
  handleCreateBenchmark
);

/**
 * PUT /benchmarks/:id
 * Actualizar benchmark (solo admin, solo custom)
 */
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateBenchmarkSchema }),
  handleUpdateBenchmark
);

/**
 * DELETE /benchmarks/:id
 * Eliminar benchmark (solo admin, solo custom)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema }),
  handleDeleteBenchmark
);

// ==========================================================
// Benchmark Components
// ==========================================================

/**
 * POST /benchmarks/:id/components
 * Agregar componente a benchmark
 */
router.post(
  '/:id/components',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: addComponentSchema }),
  handleAddComponent
);

/**
 * PUT /benchmarks/:id/components/:componentId
 * Actualizar componente de benchmark
 */
router.put(
  '/:id/components/:componentId',
  requireAuth,
  requireRole(['admin']),
  validate({
    params: z.object({ id: uuidSchema, componentId: uuidSchema }),
    body: updateComponentSchema,
  }),
  handleUpdateComponent
);

/**
 * DELETE /benchmarks/:id/components/:componentId
 * Eliminar componente de benchmark
 */
router.delete(
  '/:id/components/:componentId',
  requireAuth,
  requireRole(['admin']),
  validate({
    params: z.object({ id: uuidSchema, componentId: uuidSchema }),
  }),
  handleDeleteComponent
);

export default router;
