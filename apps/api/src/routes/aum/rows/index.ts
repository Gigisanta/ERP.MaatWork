/**
 * AUM Rows Routes
 *
 * AI_DECISION: Refactorizado desde 900 líneas a módulos especializados
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado, dividido en:
 *   - types.ts: Tipos e interfaces
 *   - cache.ts: Cache de conteos
 *   - utils.ts: Utilidades (parseNumeric, constantes)
 *   - handlers/list.ts: Listar filas
 *   - handlers/duplicates.ts: Obtener duplicados
 *   - handlers/match.ts: Matching manual
 *   - handlers/update-advisor.ts: Actualizar asesor
 *   - handlers/monthly-history.ts: Historial mensual
 */

import { Router } from 'express';
import { requireAuth } from '../../../auth/middlewares';
import { validate } from '../../../utils/validation';
import {
  aumRowsAllQuerySchema,
  aumAccountNumberParamsSchema,
  aumFileIdParamsSchema,
  aumMatchRowBodySchema,
  aumMonthlyHistoryQuerySchema,
  aumUpdateAdvisorBodySchema,
  aumRowIdParamsSchema,
} from '../../../utils/aum-validation';

// Handlers
import { listAllRows } from './handlers/list';
import { getDuplicates } from './handlers/duplicates';
import { matchRow } from './handlers/match';
import { updateAdvisor } from './handlers/update-advisor';
import { getMonthlyHistory } from './handlers/monthly-history';

const router = Router();

// GET /admin/aum/rows/all - Get all imported rows with pagination and filters
router.get('/all', requireAuth, validate({ query: aumRowsAllQuerySchema }), listAllRows);

// GET /admin/aum/rows/duplicates/:accountNumber - Get all rows with same account number
router.get(
  '/duplicates/:accountNumber',
  requireAuth,
  validate({ params: aumAccountNumberParamsSchema }),
  getDuplicates
);

// GET /admin/aum/rows/monthly-history - Get monthly history for AUM accounts
router.get(
  '/monthly-history',
  requireAuth,
  validate({ query: aumMonthlyHistoryQuerySchema }),
  getMonthlyHistory
);

// PATCH /admin/aum/rows/:rowId - Update advisor for a specific AUM row
router.patch(
  '/:rowId',
  requireAuth,
  validate({ params: aumRowIdParamsSchema, body: aumUpdateAdvisorBodySchema }),
  updateAdvisor
);

export { matchRow };

export default router;
