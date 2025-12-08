/**
 * AdvisorAumSummary Component
 *
 * AI_DECISION: Tabla de resumen de AUM por asesor con selector de período - sticky
 * Justificación: Permite visualizar totales de AUM agrupados por asesor y filtrar por mes
 * Impacto: Visibilidad del performance de asesores y tracking mensual de AUM
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Text } from '@cactus/ui';
import {
  getAdvisorAumSummary,
  getAvailableAumPeriods,
  type AdvisorSummaryItem,
} from '@/lib/api/aum';
import { formatNumber } from '../lib/aumRowsUtils';

interface AdvisorAumSummaryProps {
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Fetcher para SWR - Resumen por asesor
 *
 * AI_DECISION: Construir objeto params solo con valores definidos
 * Justificación: exactOptionalPropertyTypes requiere no pasar undefined a opcionales
 * Impacto: Evita error de TypeScript con propiedades opcionales estrictas
 */
async function summaryFetcher([_key, month, year]: [
  string,
  number | undefined,
  number | undefined,
]) {
  const params: { reportMonth?: number; reportYear?: number } = {};
  if (month !== undefined) params.reportMonth = month;
  if (year !== undefined) params.reportYear = year;

  const response = await getAdvisorAumSummary(params);
  return response.data;
}

/**
 * Fetcher para SWR - Períodos disponibles
 */
async function periodsFetcher() {
  const response = await getAvailableAumPeriods();
  return response.data;
}

export function AdvisorAumSummary({
  className = '',
  defaultExpanded = true,
}: AdvisorAumSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  const [selectedYear, setSelectedYear] = useState<number | undefined>();

  // Obtener períodos disponibles
  const { data: periodsData, isLoading: periodsLoading } = useSWR(
    'aum-available-periods',
    periodsFetcher,
    { revalidateOnFocus: false }
  );

  // Auto-seleccionar el período más reciente cuando se cargan los períodos
  useEffect(() => {
    if (periodsData?.periods && periodsData.periods.length > 0 && !selectedMonth && !selectedYear) {
      const mostRecent = periodsData.periods[0];
      setSelectedMonth(mostRecent.month);
      setSelectedYear(mostRecent.year);
    }
  }, [periodsData, selectedMonth, selectedYear]);

  // Obtener resumen por asesor
  const { data: summaryData, isLoading: summaryLoading } = useSWR(
    selectedMonth && selectedYear ? ['aum-advisor-summary', selectedMonth, selectedYear] : null,
    summaryFetcher,
    { revalidateOnFocus: false }
  );

  // Manejar cambio de período
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedMonth(undefined);
      setSelectedYear(undefined);
    } else {
      const [month, year] = value.split('-').map(Number);
      setSelectedMonth(month);
      setSelectedYear(year);
    }
  };

  // Obtener el valor actual del select
  const currentPeriodValue = useMemo(() => {
    if (selectedMonth && selectedYear) {
      return `${selectedMonth}-${selectedYear}`;
    }
    return '';
  }, [selectedMonth, selectedYear]);

  const isLoading = periodsLoading || summaryLoading;
  const summary = summaryData?.summary || [];
  const totals = summaryData?.totals;
  const periods = periodsData?.periods || [];

  // Calcular estadísticas rápidas
  // AI_DECISION: Separar entre asesores matcheados (con cuenta en app) y no matcheados (solo en archivo)
  const matchedAdvisors = summary.filter((s) => s.isMatched).length;
  const unmatchedAdvisors = summary.filter(
    (s) => !s.isMatched && s.advisorName !== 'Sin asignar'
  ).length;
  const unassignedClients = summary.find((s) => s.advisorName === 'Sin asignar')?.clientCount || 0;

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden sticky top-0 z-30 ${className}`}
    >
      {/* Header con toggle y selector de período */}
      <div
        className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <svg
                className={`w-5 h-5 text-white transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Resumen por Asesor</h3>
              {!isLoading && totals && (
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-emerald-100">
                    {matchedAdvisors} vinculados • {unmatchedAdvisors} sin vincular •{' '}
                    {totals.clientCount} cuentas
                    {unassignedClients > 0 && ` • ${unassignedClients} sin asesor`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selector de período */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <label htmlFor="period-select" className="text-xs text-emerald-100 font-medium">
              Período:
            </label>
            <select
              id="period-select"
              value={currentPeriodValue}
              onChange={handlePeriodChange}
              disabled={periodsLoading}
              className="text-sm border-0 rounded-lg px-3 py-1.5 bg-white/20 text-white font-medium 
                         focus:ring-2 focus:ring-white/50 focus:outline-none
                         [&>option]:bg-gray-800 [&>option]:text-white"
            >
              {periodsLoading ? (
                <option value="">Cargando...</option>
              ) : periods.length === 0 ? (
                <option value="">Sin períodos</option>
              ) : (
                periods.map((period) => (
                  <option
                    key={`${period.month}-${period.year}`}
                    value={`${period.month}-${period.year}`}
                  >
                    {period.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Contenido expandible con animación */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center bg-gradient-to-b from-gray-50 to-white">
              <div className="inline-flex items-center gap-3 text-gray-500">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <Text size="sm" className="font-medium">
                  Cargando resumen de asesores...
                </Text>
              </div>
            </div>
          ) : summary.length === 0 ? (
            <div className="p-8 text-center bg-gradient-to-b from-gray-50 to-white">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <Text size="sm" className="text-gray-500 font-medium">
                No hay datos para el período seleccionado
              </Text>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 text-left bg-gray-50">Asesor</th>
                  <th className="px-3 py-3 text-right bg-gray-50">Cuentas</th>
                  <th className="px-3 py-3 text-right bg-gray-50">AUM USD</th>
                  <th className="px-3 py-3 text-right bg-gray-50">Bolsa Arg</th>
                  <th className="px-3 py-3 text-right bg-gray-50">Fondos Arg</th>
                  <th className="px-3 py-3 text-right bg-gray-50">Bolsa BCI</th>
                  <th className="px-3 py-3 text-right bg-gray-50">Pesos</th>
                  <th className="px-3 py-3 text-right bg-gray-50">MEP</th>
                  <th className="px-3 py-3 text-right bg-gray-50">Cable</th>
                  <th className="px-3 py-3 text-right bg-gray-50">CV7000</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((advisor, index) => (
                  <AdvisorSummaryRow
                    key={advisor.advisorId || `unassigned-${index}`}
                    advisor={advisor}
                  />
                ))}
              </tbody>
              {/* Fila de totales */}
              {totals && (
                <tfoot className="bg-gradient-to-r from-emerald-50 to-teal-50 sticky bottom-0">
                  <tr className="text-sm font-bold text-gray-800 border-t-2 border-emerald-200">
                    <td className="px-4 py-3 text-left">
                      <span className="text-emerald-700">Total General</span>
                    </td>
                    <td className="px-3 py-3 text-right">{totals.clientCount}</td>
                    <td className="px-3 py-3 text-right text-emerald-700 text-base">
                      {formatNumber(totals.aumDollars)}
                    </td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.bolsaArg)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.fondosArg)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.bolsaBci)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.pesos)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.mep)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.cable)}</td>
                    <td className="px-3 py-3 text-right">{formatNumber(totals.cv7000)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Fila de resumen de asesor
 */
interface AdvisorSummaryRowProps {
  advisor: AdvisorSummaryItem;
}

function AdvisorSummaryRow({ advisor }: AdvisorSummaryRowProps) {
  const isUnassigned = advisor.advisorName === 'Sin asignar';
  const isMatched = advisor.isMatched;

  // Determinar estilo según estado
  const rowStyle = isUnassigned
    ? 'bg-amber-50/70 hover:bg-amber-100/70'
    : isMatched
      ? 'bg-white hover:bg-gray-50'
      : 'bg-blue-50/50 hover:bg-blue-100/50';

  return (
    <tr className={`text-sm transition-colors ${rowStyle}`}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isUnassigned ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <span className="text-amber-700 font-semibold">{advisor.advisorName}</span>
            </div>
          ) : isMatched ? (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 font-bold text-xs">
                  {advisor.advisorName
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-800 font-medium">{advisor.advisorName}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                    ✓ Vinculado
                  </span>
                </div>
                {advisor.advisorEmail && (
                  <Text size="xs" className="text-gray-400 block truncate max-w-[150px]">
                    {advisor.advisorEmail}
                  </Text>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-bold text-xs">
                  {advisor.advisorName
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-800 font-medium">{advisor.advisorName}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    Sin vincular
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span
          className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold ${
            isUnassigned ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {advisor.clientCount}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
        {formatNumber(advisor.aumDollars)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.bolsaArg)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.fondosArg)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.bolsaBci)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.pesos)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.mep)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.cable)}
      </td>
      <td className="px-3 py-2.5 text-right text-gray-600 tabular-nums">
        {formatNumber(advisor.cv7000)}
      </td>
    </tr>
  );
}
