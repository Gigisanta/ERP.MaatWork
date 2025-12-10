/**
 * Tipos para el módulo de plan de carrera comercial
 */

import type { TimestampedEntity, CreateRequest, UpdateRequest } from './common';

/**
 * Nivel del plan de carrera comercial
 */
export interface CareerPlanLevel extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  category: string; // Ej: "AGENTE F. JUNIOR"
  level: string; // Ej: "Nivel 1 Junior"
  levelNumber: number; // Orden numérico (1, 2, 3...)
  index: string; // Índice del nivel (numeric como string)
  percentage: string; // Porcentaje (numeric como string)
  annualGoalUsd: number; // Objetivo anual en USD
  isActive: boolean;
}

/**
 * Request para crear un nivel del plan de carrera - usando utility type CreateRequest
 * Nota: index y percentage aceptan string | number para flexibilidad en el formulario
 */
export interface CareerPlanLevelCreateRequest
  extends Omit<CreateRequest<CareerPlanLevel>, 'isActive' | 'index' | 'percentage'> {
  category: string;
  level: string;
  levelNumber: number;
  index: string | number;
  percentage: string | number;
  annualGoalUsd: number;
  isActive?: boolean;
}

/**
 * Request para actualizar un nivel del plan de carrera - usando utility type UpdateRequest
 */
export interface CareerPlanLevelUpdateRequest extends UpdateRequest<CareerPlanLevel> {}

/**
 * Progreso del usuario en el plan de carrera
 */
export interface UserCareerProgress {
  currentLevel: CareerPlanLevel | null;
  annualProduction: number; // Producción anual estimada (suma de primas mensuales * 12)
  progressPercentage: number; // Porcentaje de progreso hacia el objetivo del nivel actual (0-100+)
  nextLevel: CareerPlanLevel | null; // Siguiente nivel (si existe)
}
