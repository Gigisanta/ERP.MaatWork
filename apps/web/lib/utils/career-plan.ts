export {
  formatAnnualGoal,
  formatProgressPercentage,
  formatLevelPercentage,
} from '@maatwork/utils';

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
