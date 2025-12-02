/**
 * Instruments Routes - Re-exportación para compatibilidad
 *
 * AI_DECISION: Archivo refactorizado de 861 líneas a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, ahora dividido en:
 *   - instruments/utils.ts: Utilidades y constantes
 *   - instruments/circuit-breaker.ts: Circuit breaker
 *   - instruments/handlers/search.ts: Búsqueda
 *   - instruments/handlers/validate.ts: Validación
 *   - instruments/handlers/crud.ts: CRUD
 *   - instruments/index.ts: Router principal
 */

export { default } from './instruments/index';
