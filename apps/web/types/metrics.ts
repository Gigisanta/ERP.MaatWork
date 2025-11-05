/**
 * Tipos relacionados con métricas del pipeline de contactos
 */

import type { TimestampedEntity } from './common';

/**
 * Líneas de negocio disponibles para categorizar etiquetas
 */
export type BusinessLine = 'inversiones' | 'zurich' | 'patrimonial';

/**
 * Métricas de un mes específico
 */
export interface MonthlyMetrics {
  month: number; // 1-12
  year: number;
  newProspects: number;
  firstMeetings: number;
  secondMeetings: number;
  newClients: number;
  businessLineClosures: BusinessLineClosures;
  transitionTimes: StageTransitionTime;
}

/**
 * Cierres por línea de negocio
 */
export interface BusinessLineClosures {
  inversiones: number;
  zurich: number;
  patrimonial: number;
}

/**
 * Tiempos promedio entre avances de etapa (en días)
 */
export interface StageTransitionTime {
  prospectoToFirstMeeting: number | null; // Prospecto → Primera reunión
  firstToSecondMeeting: number | null; // Primera reunión → Segunda reunión
  secondMeetingToClient: number | null; // Segunda reunión → Cliente
}

/**
 * Objetivos mensuales globales
 */
export interface MonthlyGoal extends TimestampedEntity {
  month: number; // 1-12
  year: number;
  newProspectsGoal: number;
  firstMeetingsGoal: number;
  secondMeetingsGoal: number;
  newClientsGoal: number;
}

/**
 * Request para crear/actualizar objetivos mensuales
 */
export interface SaveMonthlyGoalRequest {
  month: number;
  year: number;
  newProspectsGoal: number;
  firstMeetingsGoal: number;
  secondMeetingsGoal: number;
  newClientsGoal: number;
}

/**
 * Respuesta del endpoint de métricas
 */
export interface ContactsMetricsResponse {
  currentMonth: MonthlyMetrics;
  history: MonthlyMetrics[];
  goals?: MonthlyGoal | null;
}

