/**
 * Portfolio Routes - Re-exportación para compatibilidad
 *
 * AI_DECISION: Archivo refactorizado de 914 líneas a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado, ahora dividido en:
 *   - portfolio/schemas.ts: Validaciones Zod
 *   - portfolio/handlers/templates.ts: CRUD de plantillas
 *   - portfolio/handlers/template-lines.ts: Líneas de plantillas
 *   - portfolio/handlers/assignments.ts: Asignaciones de carteras
 *   - portfolio/index.ts: Router principal
 *
 * REGLA CURSOR: Portfolios - mantener RBAC, validaciones, logging estructurado, no romper API sin versioning
 */

export { default } from './portfolio/index';
