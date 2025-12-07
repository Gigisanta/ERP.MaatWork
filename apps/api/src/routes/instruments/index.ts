/**
 * Instruments Routes
 *
 * AI_DECISION: Refactorizado desde 861 líneas a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, dividido en:
 *   - utils.ts: Utilidades y constantes
 *   - circuit-breaker.ts: Circuit breaker para servicio Python
 *   - handlers/search.ts: Búsqueda de instrumentos
 *   - handlers/validate.ts: Validación de símbolos
 *   - handlers/crud.ts: Operaciones CRUD
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';

// Handlers
import { searchInstruments } from './handlers/search';
import { validateSymbol } from './handlers/validate';
import {
  createInstrument,
  listInstruments,
  getInstrumentById,
  updateInstrument,
  deleteInstrument,
} from './handlers/crud';

const router = Router();

// POST /instruments/search - Buscar símbolos
router.post(
  '/search',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  searchInstruments
);

// GET /search/validate/:symbol - Validar símbolo
router.get(
  '/search/validate/:symbol',
  requireAuth,
  requireRole(['advisor', 'manager', 'admin']),
  validateSymbol
);

// POST /instruments - Crear instrumento
router.post('/', requireAuth, requireRole(['advisor', 'manager', 'admin']), createInstrument);

// GET /instruments - Listar instrumentos
router.get('/', requireAuth, requireRole(['advisor', 'manager', 'admin']), listInstruments);

// GET /instruments/:id - Obtener instrumento por ID
router.get('/:id', requireAuth, requireRole(['advisor', 'manager', 'admin']), getInstrumentById);

// PUT /instruments/:id - Actualizar instrumento
router.put('/:id', requireAuth, requireRole(['manager', 'admin']), updateInstrument);

// DELETE /instruments/:id - Eliminar instrumento
router.delete('/:id', requireAuth, requireRole(['admin']), deleteInstrument);

export default router;



























