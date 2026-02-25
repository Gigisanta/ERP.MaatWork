/**
 * Circuit Breaker para servicio Python de Instruments
 */

import { CircuitBreaker } from '../../utils/validation/circuit-breaker';

// AI_DECISION: Circuit breaker para servicio Python externo
// Justificación: Previene llamadas repetidas cuando el servicio está caído, permite fallback rápido
// Impacto: Mejor resiliencia, menos carga en servicio fallido, recuperación automática
export const pythonServiceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // Abrir después de 5 fallos
  resetTimeout: 30000, // Intentar half-open después de 30 segundos
  timeout: 15000, // Timeout de 15 segundos por request
  successThreshold: 2, // Cerrar después de 2 éxitos en half-open
});
