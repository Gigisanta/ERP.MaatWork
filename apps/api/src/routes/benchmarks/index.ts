/**
 * Benchmarks Routes
 *
 * AI_DECISION: Modularizar endpoints de benchmarks en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';

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

const router = Router();

// ==========================================================
// Benchmarks CRUD
// ==========================================================

/**
 * GET /benchmarks
 * Listar benchmarks disponibles
 */
router.get('/', requireAuth, handleListBenchmarks);

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
router.get('/:id', requireAuth, handleGetBenchmark);

/**
 * POST /benchmarks
 * Crear benchmark custom (solo admin)
 */
router.post('/', requireAuth, requireRole(['admin']), handleCreateBenchmark);

/**
 * PUT /benchmarks/:id
 * Actualizar benchmark (solo admin, solo custom)
 */
router.put('/:id', requireAuth, requireRole(['admin']), handleUpdateBenchmark);

/**
 * DELETE /benchmarks/:id
 * Eliminar benchmark (solo admin, solo custom)
 */
router.delete('/:id', requireAuth, requireRole(['admin']), handleDeleteBenchmark);

// ==========================================================
// Benchmark Components
// ==========================================================

/**
 * POST /benchmarks/:id/components
 * Agregar componente a benchmark
 */
router.post('/:id/components', requireAuth, requireRole(['admin']), handleAddComponent);

/**
 * PUT /benchmarks/:id/components/:componentId
 * Actualizar componente de benchmark
 */
router.put(
  '/:id/components/:componentId',
  requireAuth,
  requireRole(['admin']),
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
  handleDeleteComponent
);

export default router;
