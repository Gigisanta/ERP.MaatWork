/**
 * Tasks Routes
 *
 * AI_DECISION: Modularizar endpoints de tasks en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

// REGLA CURSOR: Tasks CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';

// Import schemas
import {
  listTasksQuerySchema,
  exportTasksQuerySchema,
  createTaskSchema,
  updateTaskSchema,
  bulkActionSchema,
  taskIdParamsSchema,
  batchTasksQuerySchema,
} from './schemas';

// Import handlers
import { handleListTasks } from './handlers/list';
import { handleGetTask } from './handlers/get';
import { handleCreateTask, handleUpdateTask, handleDeleteTask } from './handlers/crud';
import { handleCompleteTask } from './handlers/complete';
import { handleBulkAction } from './handlers/bulk';
import { handleExportCsv } from './handlers/export';
import { handleBatchTasks } from './handlers/batch';

const router = Router();

// ==========================================================
// GET /tasks - Listar tareas con filtros
// ==========================================================
router.get('/', requireAuth, validate({ query: listTasksQuerySchema }), handleListTasks);

// ==========================================================
// GET /tasks/export/csv - Exportar tareas a CSV
// ==========================================================
router.get(
  '/export/csv',
  requireAuth,
  validate({ query: exportTasksQuerySchema }),
  handleExportCsv
);

// ==========================================================
// GET /tasks/batch - Obtener tareas de múltiples contactos (batch)
// ==========================================================
router.get('/batch', requireAuth, validate({ query: batchTasksQuerySchema }), handleBatchTasks);

// ==========================================================
// GET /tasks/:id - Obtener tarea específica
// ==========================================================
router.get('/:id', requireAuth, handleGetTask);

// ==========================================================
// POST /tasks - Crear nueva tarea
// ==========================================================
router.post('/', requireAuth, validate({ body: createTaskSchema }), handleCreateTask);

// ==========================================================
// POST /tasks/bulk - Acciones masivas sobre tareas
// ==========================================================
router.post('/bulk', requireAuth, validate({ body: bulkActionSchema }), handleBulkAction);

// ==========================================================
// POST /tasks/:id/complete - Completar tarea
// ==========================================================
router.post('/:id/complete', requireAuth, handleCompleteTask);

// ==========================================================
// PUT /tasks/:id - Actualizar tarea
// ==========================================================
router.put(
  '/:id',
  requireAuth,
  validate({
    params: taskIdParamsSchema,
    body: updateTaskSchema,
  }),
  handleUpdateTask
);

// ==========================================================
// DELETE /tasks/:id - Soft delete de tarea
// ==========================================================
router.delete('/:id', requireAuth, handleDeleteTask);

export default router;








