/**
 * Tipos para el módulo de plan de carrera comercial (Backend)
 */

import type { InferSelectModel } from 'drizzle-orm';
import { careerPlanLevels } from '@cactus/db/schema';

/**
 * Nivel del plan de carrera inferido del schema
 */
export type CareerPlanLevel = InferSelectModel<typeof careerPlanLevels>;

/**
 * Request para crear un nivel del plan de carrera
 */
export interface CreateCareerPlanLevelRequest {
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
export interface UpdateCareerPlanLevelRequest {
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
