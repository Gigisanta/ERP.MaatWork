/**
 * Metrics Contacts Routes
 *
 * Re-exports from modular structure in ./contacts/ for backward compatibility.
 *
 * AI_DECISION: Refactorizado a estructura modular en ./contacts/
 * Justificación: Archivo original de 661 líneas con función calculateMonthlyMetrics de 374 líneas
 * Impacto: Calculadores individuales más testeables, código más navegable
 *
 * Estructura modular:
 * - ./contacts/types.ts - Tipos compartidos
 * - ./contacts/helpers.ts - Funciones auxiliares (getFirstTimeStageEntries, etc.)
 * - ./contacts/calculators/ - Calculadores individuales por métrica
 * - ./contacts/calculate-monthly.ts - Orquestador de métricas mensuales
 * - ./contacts/index.ts - Router con endpoints
 */

import contactsMetricsRouter from './contacts/index';

export default contactsMetricsRouter;
