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

export interface MonthlyMetrics {
  month: number;
  year: number;
  newProspects: number;
  firstMeetings: number;
  secondMeetings: number;
  newClients: number;
  businessLineClosures: BusinessLineClosures;
  transitionTimes: TransitionTimes;
}

export interface CalculatorContext {
  stageIds: PipelineStageIds;
  range: MonthRange;
  accessFilter: AccessFilter;
  month: number;
  year: number;
}
