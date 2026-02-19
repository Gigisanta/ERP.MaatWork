'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { DashboardData } from '@/types';
import { formatCurrency, formatDateShort } from '@maatwork/utils';

// AI_DECISION: Lazy load chart component to reduce initial bundle size
// Justificación: Recharts is heavy (~200KB), loading it async reduces initial bundle significantly
// Impacto: Faster initial page load, smaller initial JavaScript bundle (~200KB reduction)
const AumTrendChart = dynamic(() => import('./AumTrendChart'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-text-muted">Cargando gráfico...</div>,
});

const RiskDistributionChart = dynamic(() => import('./RiskDistributionChart'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-text-muted">Cargando gráfico...</div>,
});

interface AnalyticsClientProps {
  dashboardData: DashboardData;
}

// AI_DECISION: Funciones de formateo definidas DENTRO del Client Component
// Justificación: Next.js no permite pasar funciones de Server Components a Client Components
// Impacto: Evita el error "Functions cannot be passed directly to Client Components"
// function removed in favor of shared utility

// function removed in favor of shared utility

const getRiskLevelLabel = (riskLevel: string | null): string => {
  switch (riskLevel) {
    case 'low':
      return 'Conservador';
    case 'mid':
      return 'Balanceado';
    case 'high':
      return 'Agresivo';
    default:
      return riskLevel || 'Sin definir';
  }
};

const getRiskLevelColor = (riskLevel: string | null): string => {
  switch (riskLevel) {
    case 'low':
      return 'var(--color-success)';
    case 'mid':
      return 'var(--color-warning)';
    case 'high':
      return 'var(--color-error)';
    default:
      return 'var(--color-text-muted)';
  }
};

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-AR').format(value);
};

/**
 * AnalyticsClient - Client Component para visualización de analytics
 *
 * AI_DECISION: Convertido a Client Component completo siguiendo patrón del repo
 * Justificación: Necesita funciones internas para formateo y charts con interactividad
 * Impacto: Soluciona error de pasar funciones a Client Components
 */
export default function AnalyticsClient({ dashboardData }: AnalyticsClientProps) {
  const { role, kpis, aumTrend, riskDistribution, topClients } = dashboardData;

  // Animation state for page transitions
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Calcular totales de distribución de riesgo para porcentajes
  const totalRiskCount = riskDistribution?.reduce((acc, item) => acc + item.count, 0) || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Cards de KPIs principales */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-all duration-500 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '50ms' }}
      >
        {/* KPIs para ADVISOR */}
        {role === 'advisor' && (
          <>
            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-info/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-info mb-2">AUM Total Clientes</h3>
              <div className="text-2xl font-bold text-info">
                {formatCurrency(Number(kpis.totalAUM || kpis.totalAum || 0))}
              </div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-success/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-success mb-2">Clientes con Cartera</h3>
              <div className="text-2xl font-bold text-success">
                {kpis.clientsWithPortfolio || kpis.portfolioCount || 0}
              </div>
            </div>

            <div
              className={`p-5 bg-surface border rounded-xl text-center transition-all ${
                kpis.deviationAlerts && kpis.deviationAlerts > 0
                  ? 'border-error/30 hover:border-error/50'
                  : 'border-border hover:border-success/30'
              } hover:shadow-sm`}
            >
              <h3
                className={`text-sm font-semibold mb-2 ${
                  kpis.deviationAlerts && kpis.deviationAlerts > 0 ? 'text-error' : 'text-success'
                }`}
              >
                Alertas de Desvío
              </h3>
              <div
                className={`text-2xl font-bold ${
                  kpis.deviationAlerts && kpis.deviationAlerts > 0 ? 'text-error' : 'text-success'
                }`}
              >
                {kpis.deviationAlerts || 0}
              </div>
            </div>
          </>
        )}

        {/* KPIs para MANAGER */}
        {role === 'manager' && (
          <>
            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-info/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-info mb-2">AUM Total Equipo</h3>
              <div className="text-2xl font-bold text-info">
                {formatCurrency(Number(kpis.teamAUM || kpis.teamAum || 0))}
              </div>
            </div>

            {riskDistribution && riskDistribution.length > 0 && (
              <div className="p-5 bg-surface border border-border rounded-xl hover:border-warning/30 hover:shadow-sm transition-all">
                <h3 className="text-sm font-semibold text-warning mb-3 text-center">
                  Distribución de Riesgo
                </h3>
                <div className="flex flex-col gap-2">
                  {riskDistribution.map((item) => (
                    <div key={item.riskLevel} className="flex justify-between items-center">
                      <span className="text-xs text-text-secondary">
                        {getRiskLevelLabel(item.riskLevel)}
                      </span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          color: getRiskLevelColor(item.riskLevel),
                          backgroundColor: `${getRiskLevelColor(item.riskLevel)}20`,
                        }}
                      >
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* KPIs para ADMIN */}
        {role === 'admin' && (
          <>
            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-info/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-info mb-2">AUM Global</h3>
              <div className="text-2xl font-bold text-info">
                {formatCurrency(Number(kpis.globalAum || kpis.totalAUM || 0))}
              </div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-success/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-success mb-2">Carteras Activas</h3>
              <div className="text-2xl font-bold text-success">{kpis.activeTemplates || 0}</div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-warning/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-warning mb-2">Sin Cartera</h3>
              <div className="text-2xl font-bold text-warning">
                {kpis.clientsWithoutPortfolio || 0}
              </div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-error/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-error mb-2">Sin Precio Actualizado</h3>
              <div className="text-2xl font-bold text-error">
                {kpis.instrumentsWithoutPrice || 0}
              </div>
            </div>
          </>
        )}

        {/* KPIs para OWNER - Vista ejecutiva completa de la agencia */}
        {role === 'owner' && (
          <>
            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-info/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-info mb-2">📊 AUM Global</h3>
              <div className="text-2xl font-bold text-info">
                {formatCurrency(Number(kpis.globalAum || 0))}
              </div>
              <p className="text-xs text-text-muted mt-1">Total administrado</p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-success/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-success mb-2">👥 Total Clientes</h3>
              <div className="text-2xl font-bold text-success">
                {formatNumber(kpis.totalClients || 0)}
              </div>
              <p className="text-xs text-text-muted mt-1">Activos en el sistema</p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-primary/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-primary mb-2">🎯 Asesores Activos</h3>
              <div className="text-2xl font-bold text-primary">
                {formatNumber(kpis.totalAdvisors || 0)}
              </div>
              <p className="text-xs text-text-muted mt-1">Operando actualmente</p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-warning/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-warning mb-2">🏢 Equipos</h3>
              <div className="text-2xl font-bold text-warning">
                {formatNumber(kpis.totalTeams || 0)}
              </div>
              <p className="text-xs text-text-muted mt-1">Configurados</p>
            </div>
          </>
        )}

        {/* KPIs para STAFF */}
        {role === 'staff' && (
          <>
            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-info/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-info mb-2">AUM Global</h3>
              <div className="text-2xl font-bold text-info">
                {formatCurrency(Number(kpis.globalAum || 0))}
              </div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-success/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-success mb-2">Total Clientes</h3>
              <div className="text-2xl font-bold text-success">
                {formatNumber(kpis.totalClients || 0)}
              </div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:border-warning/30 hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-warning mb-2">Sin Cartera</h3>
              <div className="text-2xl font-bold text-warning">
                {kpis.clientsWithoutPortfolio || 0}
              </div>
            </div>

            <div className="p-5 bg-surface border border-border rounded-xl text-center hover:shadow-sm transition-all">
              <h3 className="text-sm font-semibold text-text-muted mb-2">Carteras Modelo</h3>
              <div className="text-2xl font-bold text-text">{kpis.activeTemplates || 0}</div>
            </div>
          </>
        )}
      </div>

      {/* Distribución de Riesgo para Owner - Vista visual */}
      {role === 'owner' && riskDistribution && riskDistribution.length > 0 && (
        <div
          className={`p-5 bg-surface border border-border rounded-xl shadow-sm transition-all duration-500 ease-out ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '150ms' }}
        >
          <h3 className="text-base font-semibold mb-4">
            Distribución de Perfiles de Riesgo - Toda la Agencia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Barras de progreso */}
            <div className="flex flex-col gap-3">
              {riskDistribution.map((item) => {
                const percentage = totalRiskCount > 0 ? (item.count / totalRiskCount) * 100 : 0;
                return (
                  <div key={item.riskLevel} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {getRiskLevelLabel(item.riskLevel)}
                      </span>
                      <span className="text-sm text-text-muted">
                        {item.count} clientes ({formatPercentage(percentage)})
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getRiskLevelColor(item.riskLevel),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gráfico de donut */}
            <div className="h-[200px]">
              <RiskDistributionChart
                data={riskDistribution.map((item) => ({
                  name: getRiskLevelLabel(item.riskLevel),
                  value: item.count,
                  color: getRiskLevelColor(item.riskLevel),
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de tendencia AUM - Para roles con aumTrend */}
      {aumTrend &&
        aumTrend.length > 0 &&
        (role === 'advisor' || role === 'owner' || role === 'staff') && (
          <div className="p-5 bg-surface border border-border rounded-xl shadow-sm">
            <h3 className="text-base font-semibold mb-4">
              {role === 'owner'
                ? 'Tendencia AUM Global - Últimos 30 días'
                : 'Tendencia AUM - Últimos 30 días'}
            </h3>
            <div className="h-[300px]">
              <AumTrendChart
                data={aumTrend}
                formatDate={formatDateShort}
              />
            </div>
            {role === 'owner' && aumTrend.length >= 2 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-text-muted">Inicio del período</p>
                  <p className="text-sm font-semibold">{formatCurrency(aumTrend[0].value)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Fin del período</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(aumTrend[aumTrend.length - 1].value)}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs text-text-muted">Variación</p>
                  {(() => {
                    const startValue = aumTrend[0].value;
                    const endValue = aumTrend[aumTrend.length - 1].value;
                    const variation =
                      startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
                    const isPositive = variation >= 0;
                    return (
                      <p
                        className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-error'}`}
                      >
                        {isPositive ? '+' : ''}
                        {formatPercentage(variation)}
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Top clientes (solo para managers) */}
      {role === 'manager' && topClients && topClients.length > 0 && (
        <div className="p-5 bg-surface border border-border rounded-xl shadow-sm">
          <h3 className="text-base font-semibold mb-4">Top 5 Clientes por AUM</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="p-3 text-left font-semibold">Cliente</th>
                  <th className="p-3 text-right font-semibold">AUM</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, index) => (
                  <tr key={client.contactId} className="border-b border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md text-xs font-semibold bg-surface-hover text-text min-w-[24px] text-center">
                          #{index + 1}
                        </span>
                        <Link
                          href={`/contacts/${client.contactId}`}
                          className="text-info no-underline font-medium hover:underline"
                        >
                          {client.contactName}
                        </Link>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {formatCurrency(Number(client.aum))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navegación a otras secciones */}
      <div className="p-5 bg-surface border border-border rounded-xl">
        <h3 className="text-base font-semibold mb-4">Más Analytics</h3>
        <div className="flex gap-3 flex-wrap">
          {(role === 'admin' || role === 'owner') && (
            <Link
              href="/benchmarks"
              className="px-4 py-2 bg-warning text-white rounded-md no-underline text-sm font-medium hover:bg-warning/90 transition-colors"
            >
              📊 Gestionar Benchmarks
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
