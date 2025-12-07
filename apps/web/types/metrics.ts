/**
 * Tipos relacionados con métricas del pipeline de contactos
 */

import type { TimestampedEntity } from '@cactus/types/common';

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
  marketTypeConversion: MarketTypeConversion;
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
 * Datos de conversión para un tipo de mercado específico
 */
export interface MarketTypeData {
  contacts: number;
  clients: number;
  conversionRate: number;
}

/**
 * Desglose de sub-tipos de mercado frío
 */
export interface ColdMarketBreakdown {
  redesSociales: MarketTypeData;
  llamadoFrio: MarketTypeData;
}

/**
 * Datos extendidos para mercado frío con desglose
 */
export interface ColdMarketTypeData extends MarketTypeData {
  breakdown: ColdMarketBreakdown;
}

/**
 * Conversión de contactos a clientes por tipo de mercado
 * Incluye desglose por sub-tipos de mercado frío
 */
export interface MarketTypeConversion {
  natural: MarketTypeData;
  referido: MarketTypeData;
  frio: ColdMarketTypeData;
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
