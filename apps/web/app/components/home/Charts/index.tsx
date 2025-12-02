"use client";

/**
 * Barrel export for all chart components
 * 
 * AI_DECISION: Export all charts from a single file for dynamic import optimization
 * Justificación: Allows MetricsSection to dynamically import all charts in one chunk
 * Impacto: Recharts (~200KB) loaded only when charts are rendered, not on initial page load
 */

export { GoalsComparisonChart } from './GoalsComparisonChart';
export { BusinessLineChart } from './BusinessLineChart';
export { TransitionTimesChart } from './TransitionTimesChart';


