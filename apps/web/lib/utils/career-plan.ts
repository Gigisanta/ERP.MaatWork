/**
 * Utilidades para formateo y manipulación de datos del plan de carrera
 */

/**
 * Formatea el objetivo anual en formato legible
 * Ej: 30000 -> "30,000 USD"
 */
export function formatAnnualGoal(amount: number): string {
  return `${amount.toLocaleString('es-AR')} USD`;
}

/**
 * Formatea el porcentaje de progreso
 * Ej: 75.5 -> "75.5%", 75.0 -> "75%"
 */
export function formatProgressPercentage(percentage: number): string {
  const rounded = Math.round(percentage * 10) / 10; // Redondear a 1 decimal
  if (rounded % 1 === 0) {
    return `${Math.round(rounded)}%`; // Sin decimales si es entero
  }
  return `${rounded.toFixed(1)}%`;
}

/**
 * Formatea el índice del nivel
 * Ej: "1.5" -> "1.5"
 */
export function formatIndex(index: string | number): string {
  if (typeof index === 'number') {
    return index.toString();
  }
  return index;
}

/**
 * Formatea el porcentaje del nivel
 * Ej: "37.5" -> "37.5%"
 */
export function formatLevelPercentage(percentage: string | number): string {
  const num = typeof percentage === 'number' ? percentage : parseFloat(percentage);
  if (isNaN(num)) {
    return percentage.toString();
  }
  return `${num}%`;
}

