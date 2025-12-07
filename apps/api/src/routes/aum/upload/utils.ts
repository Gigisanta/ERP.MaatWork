/**
 * Utilidades para AUM Upload
 *
 * AI_DECISION: Extraer funciones utilitarias a archivo separado
 * Justificación: Funciones pequeñas y reutilizables mejoran la legibilidad
 * Impacto: Código más modular y testeable
 */

/**
 * Verifica si un valor parece ser un email
 */
export function isEmailLike(value: string | null | undefined): boolean {
  if (!value) return false;
  return /@/.test(value);
}



























