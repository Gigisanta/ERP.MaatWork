/**
 * Contact Metrics Types
 */

import type { buildContactAccessFilter } from '../../../auth/authorization';

export type AccessFilter = ReturnType<typeof buildContactAccessFilter>;

export interface PipelineStageIds {
  contactadoStageId: string;
  prospectoStageId: string | undefined;
  firstMeetingStageId: string;
  secondMeetingStageId: string;
  clienteStageId: string;
}

export interface MonthRange {
  monthStart: Date;
  monthEnd: Date;
}

export interface BusinessLineClosures {
  inversiones: number;
  zurich: number;
  patrimonial: number;
}

export interface TransitionTimes {
  prospectoToFirstMeeting: number | null;
  firstToSecondMeeting: number | null;
  secondMeetingToClient: number | null;
}

/**
 * Conversion data for a specific market type
 */
interface MarketTypeData {
  contacts: number;
  clients: number;
  conversionRate: number;
}

/**
 * Breakdown of cold market (frio) subtypes
 */
export interface ColdMarketBreakdown {
  redesSociales: MarketTypeData;
  llamadoFrio: MarketTypeData;
}

/**
 * Extended market type data for cold market with breakdown
 */
interface ColdMarketTypeData extends MarketTypeData {
  breakdown: ColdMarketBreakdown;
}

/**
 * Contacts vs Clients conversion by market type (natural/referido/frio)
 * Includes breakdown by cold market subtypes
 */
export interface MarketTypeConversion {
  natural: MarketTypeData;
  referido: MarketTypeData;
  frio: ColdMarketTypeData;
}

export interface MonthlyMetrics {
  month: number;
  year: number;
  newProspects: number;
  firstMeetings: number;
  secondMeetings: number;
  newClients: number;
  businessLineClosures: BusinessLineClosures;
  transitionTimes: TransitionTimes;
  marketTypeConversion: MarketTypeConversion;
}

export interface CalculatorContext {
  stageIds: PipelineStageIds;
  range: MonthRange;
  accessFilter: AccessFilter;
  month: number;
  year: number;
}
