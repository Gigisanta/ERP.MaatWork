/**
 * Monthly Metrics Calculator - Orchestrator
 *
 * Orchestrates all metric calculators for a given month
 */

import { getFirstTimeStageEntries, createMonthRange } from './helpers';
import {
  calculateNewContacts,
  calculateMeetings,
  calculateNewClients,
  calculateBusinessLineClosures,
  calculateTransitionTimes,
  calculateMarketTypeConversion,
} from './calculators';
import type { AccessFilter, PipelineStageIds, MonthlyMetrics, CalculatorContext } from './types';

interface CalculateMonthlyMetricsParams {
  month: number;
  year: number;
  stageIds: PipelineStageIds;
  accessFilter: AccessFilter;
}

/**
 * Calculate all metrics for a given month
 *
 * AI_DECISION: Paralelizar las 4 llamadas a getFirstTimeStageEntries ya que son independientes.
 * Cada llamada ejecuta 2 queries (entradas en rango + verificación anteriores), totalizando 8 queries.
 * Al paralelizarlas, reducimos la latencia total de suma de queries a máximo de queries paralelas.
 */
export async function calculateMonthlyMetrics(
  params: CalculateMonthlyMetricsParams
): Promise<MonthlyMetrics> {
  const { month, year, stageIds, accessFilter } = params;
  const { contactadoStageId, firstMeetingStageId, secondMeetingStageId, clienteStageId } = stageIds;

  // Create month range
  const range = createMonthRange(month, year);

  // Context for calculators
  const ctx: CalculatorContext = {
    stageIds,
    range,
    accessFilter,
    month,
    year,
  };

  // Parallelize stage entry queries (they are independent)
  const [contactadoByContact, firstMeetingByContact, secondMeetingByContact, clientByContact] =
    await Promise.all([
      getFirstTimeStageEntries(contactadoStageId, range, accessFilter),
      getFirstTimeStageEntries(firstMeetingStageId, range, accessFilter),
      getFirstTimeStageEntries(secondMeetingStageId, range, accessFilter),
      getFirstTimeStageEntries(clienteStageId, range, accessFilter),
    ]);

  // Calculate new contacts
  const { newContactsCount } = await calculateNewContacts(ctx, contactadoByContact);

  // Calculate meetings
  const { firstMeetingsCount, secondMeetingsCount } = calculateMeetings(
    range,
    firstMeetingByContact,
    secondMeetingByContact
  );

  // Calculate new clients
  const { newClientsCount, clientContactIds } = calculateNewClients(range, clientByContact);

  // Calculate business line closures
  const businessLineClosures = await calculateBusinessLineClosures(clientContactIds);

  // Calculate transition times
  const transitionTimes = await calculateTransitionTimes(ctx);

  // Calculate market type conversion (contacts vs clients by natural/frio)
  const marketTypeConversion = await calculateMarketTypeConversion(
    range,
    accessFilter,
    clienteStageId,
    contactadoStageId
  );

  return {
    month,
    year,
    newProspects: newContactsCount, // Keep field name for compatibility
    firstMeetings: firstMeetingsCount,
    secondMeetings: secondMeetingsCount,
    newClients: newClientsCount,
    businessLineClosures,
    transitionTimes,
    marketTypeConversion,
  };
}
