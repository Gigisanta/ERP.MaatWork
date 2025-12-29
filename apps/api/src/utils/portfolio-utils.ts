/**
 * Utilidades para portfolios
 */

interface PortfolioLineWithWeight {
  targetWeight: string | number;
}

/**
 * Calcula el peso total de las líneas de un portfolio
 * @param lines - Array de líneas con targetWeight
 * @returns Suma de todos los targetWeight
 */
export function calculateTotalWeight(lines: PortfolioLineWithWeight[]): number {
  return lines.reduce((sum: number, line: PortfolioLineWithWeight) => {
    return sum + Number(line.targetWeight);
  }, 0);
}

/**
 * Valida si el peso total es válido (suma aproximadamente 1.0)
 * @param totalWeight - Peso total calculado
 * @param tolerance - Tolerancia para comparación de decimales (default: 0.0001)
 * @returns true si el peso total es válido
 */
export function isValidTotalWeight(totalWeight: number, tolerance: number = 0.0001): boolean {
  return Math.abs(totalWeight - 1.0) < tolerance;
}
