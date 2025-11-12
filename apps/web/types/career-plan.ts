/**
 * Tipos para el módulo de plan de carrera comercial
 */

import type { TimestampedEntity } from './common';

/**
 * Nivel del plan de carrera comercial
 */
export interface CareerPlanLevel extends TimestampedEntity {
  category: string; // Ej: "AGENTE F. JUNIOR"
  level: string; // Ej: "Nivel 1 Junior"
  levelNumber: number; // Orden numérico (1, 2, 3...)
  index: string; // Índice del nivel (numeric como string)
  percentage: string; // Porcentaje (numeric como string)
  annualGoalUsd: number; // Objetivo anual en USD
  isActive: boolean;
}

/**
 * Request para crear un nivel del plan de carrera
 */
export interface CareerPlanLevelCreateRequest {
  category: string;
  level: string;
  levelNumber: number;
  index: string | number;
  percentage: string | number;
  annualGoalUsd: number;
  isActive?: boolean;
}

/**
 * Request para actualizar un nivel del plan de carrera
 */
export interface CareerPlanLevelUpdateRequest {
  category?: string;
  level?: string;
  levelNumber?: number;
  index?: string | number;
  percentage?: string | number;
  annualGoalUsd?: number;
  isActive?: boolean;
}

/**
 * Progreso del usuario en el plan de carrera
 */
export interface UserCareerProgress {
  currentLevel: CareerPlanLevel | null;
  annualProduction: number; // Producción anual estimada (suma de primas mensuales * 12)
  progressPercentage: number; // Porcentaje de progreso hacia el objetivo del nivel actual (0-100+)
  nextLevel: CareerPlanLevel | null; // Siguiente nivel (si existe)
}

