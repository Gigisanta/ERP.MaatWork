/**
 * Tasks Routes
 *
 * AI_DECISION: Re-exportar router modularizado desde tasks/index.ts
 * Justificación: Mantener compatibilidad con imports existentes mientras se usa código modular
 * Impacto: Código más organizado sin romper imports existentes
 */

// REGLA CURSOR: Tasks CRUD - mantener RBAC, data isolation, validación Zod, logging estructurado
import router from './tasks/index';

export default router;
