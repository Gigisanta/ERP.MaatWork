/**
 * Benchmarks Routes
 *
 * AI_DECISION: Re-exportar router modularizado desde benchmarks/index.ts
 * Justificación: Mantener compatibilidad con imports existentes mientras se usa código modular
 * Impacto: Código más organizado sin romper imports existentes
 */

import router from './benchmarks/index';

export default router;
