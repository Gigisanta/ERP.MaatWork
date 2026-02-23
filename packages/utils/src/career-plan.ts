import type { CareerPlanLevel } from '@maatwork/types';

/**
 * Utilidades para el plan de carrera comercial (Cálculos y Formateo)
 */
export function calculateProgressPercentage(annualProduction: number, levelGoal: number): number {
  if (levelGoal === 0) {
    return 0;
  }

  const percentage = (annualProduction / levelGoal) * 100;
  return Math.round(percentage * 100) / 100; // Redondear a 2 decimales
}

/**
 * Determina el nivel alcanzado basado en producción
 */
export function determineLevelFromProduction(
  annualProduction: number,
  levels: CareerPlanLevel[]
): CareerPlanLevel | null {
  if (!levels || levels.length === 0) {
    return null;
  }

  const sortedLevels = [...levels]
    .filter((level) => level.isActive)
    .sort((a, b) => b.levelNumber - a.levelNumber);

  for (const level of sortedLevels) {
    const goalUsd = Number(level.annualGoalUsd);
    if (annualProduction >= goalUsd) {
      return level;
    }
  }

  return null;
}

/**
 * Formateadores (Migrados desde apps/web)
 */

export function formatAnnualGoal(amount: number): string {
  return `${amount.toLocaleString('es-AR')} USD`;
}

export function formatProgressPercentage(percentage: number): string {
  const rounded = Math.round(percentage * 10) / 10;
  if (rounded % 1 === 0) {
    return `${Math.round(rounded)}%`;
  }
  return `${rounded.toFixed(1)}%`;
}

export function formatLevelPercentage(percentage: string | number): string {
  const num = typeof percentage === 'number' ? percentage : parseFloat(percentage);
  if (isNaN(num)) {
    return percentage.toString();
  }
  return `${num}%`;
}

/**
 * Obtiene el siguiente nivel después del nivel actual
 */
export function getNextLevel(
  currentLevel: CareerPlanLevel | null,
  levels: CareerPlanLevel[]
): CareerPlanLevel | null {
  if (!currentLevel) {
    const lowestLevel = levels
      .filter((level) => level.isActive)
      .sort((a, b) => a.levelNumber - b.levelNumber)[0];
    return lowestLevel || null;
  }

  const nextLevel = levels
    .filter((level) => level.isActive && level.levelNumber > currentLevel.levelNumber)
    .sort((a, b) => a.levelNumber - b.levelNumber)[0];

  return nextLevel || null;
}
