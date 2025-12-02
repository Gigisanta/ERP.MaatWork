/**
 * AUM Rows Routes - Re-exportación para compatibilidad
 *
 * AI_DECISION: Archivo refactorizado de 900 líneas a módulos especializados
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado, ahora dividido en:
 *   - rows/types.ts: Tipos e interfaces
 *   - rows/cache.ts: Cache de conteos
 *   - rows/utils.ts: Utilidades
 *   - rows/handlers/list.ts: Listar filas
 *   - rows/handlers/duplicates.ts: Obtener duplicados
 *   - rows/handlers/match.ts: Matching manual
 *   - rows/handlers/update-advisor.ts: Actualizar asesor
 *   - rows/handlers/monthly-history.ts: Historial mensual
 *   - rows/index.ts: Router principal
 */

export { default, matchRow } from './rows/index';
