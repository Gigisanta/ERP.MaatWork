'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Spinner,
  Alert,
  Text,
  Stack,
  Select,
  type SelectItem,
  Grid,
  GridItem,
} from '@cactus/ui';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { MetricCard } from './MetricCard';
// AI_DECISION: Import GoalsComparisonChart statically to avoid webpack module resolution issues
// Justificación: Dynamic import of GoalsComparisonChart causes webpack to fail resolving recharts Cell component
// Impacto: Adds ~50KB to initial bundle, but fixes "Cannot read properties of undefined (reading 'call')" error
// Note: Other charts still use dynamic import to minimize bundle size impact
import { GoalsComparisonChart } from './Charts/GoalsComparisonChart';

// AI_DECISION: Dynamic import of chart components to reduce initial bundle size
// Justificación: Recharts (~200KB) is heavy; lazy loading reduces First Load JS significantly
// Impacto: Faster initial page load, charts load on demand when user scrolls to metrics section

const BusinessLineChart = dynamic(
  async () => {
    const mod = await import('./Charts/BusinessLineChart');
    return { default: mod.BusinessLineChart };
  },
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

const TransitionTimesChart = dynamic(
  async () => {
    const mod = await import('./Charts/TransitionTimesChart');
    return { default: mod.TransitionTimesChart };
  },
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

const MarketTypeConversionChart = dynamic(
  async () => {
    const mod = await import('./Charts/MarketTypeConversionChart');
    return { default: mod.MarketTypeConversionChart };
  },
  {
    loading: () => <ChartLoadingFallback />,
    ssr: false,
  }
);

// Loading fallback for charts
function ChartLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[220px]">
      <Stack direction="row" gap="sm" align="center">
        <Spinner size="sm" />
        <Text color="secondary" size="sm">
          Cargando gráfico...
        </Text>
      </Stack>
    </div>
  );
}

interface MetricsSectionProps {
  metricsData: MonthlyMetrics | null;
  goalsData: MonthlyGoal | null;
  loading: boolean;
  error: string | null;
}

type ChartView = 'goals' | 'businessLines' | 'transitionTimes' | 'marketConversion';

// Mapeo de métricas a colores usando variables CSS del sistema de diseño
// Nota: Para 'Segundas Reuniones' usamos un color naranja que no tiene variable equivalente
// pero mantenemos consistencia con el diseño existente
const METRIC_COLORS = {
  'Nuevos Contactos': 'var(--color-chart-1)', // Azul - #3b82f6
  'Primeras Reuniones': 'var(--color-chart-3)', // Amarillo/Naranja - #f59e0b
  'Segundas Reuniones': '#f97316', // Naranja - mantiene consistencia visual con diseño existente
  'Nuevos Clientes': 'var(--color-chart-2)', // Verde - #22c55e
} as const;

/**
 * Sección completa de métricas con gráficos y cards individuales
 */
export function MetricsSection({ metricsData, goalsData, loading, error }: MetricsSectionProps) {
  const [chartView, setChartView] = useState<ChartView>('goals');

  const chartItems = useMemo<SelectItem[]>(
    () => [
      { value: 'goals', label: 'Objetivos vs Actuales' },
      { value: 'businessLines', label: 'Cierres por Línea de Negocio' },
      { value: 'transitionTimes', label: 'Tiempo Promedio entre Avances' },
      { value: 'marketConversion', label: 'Conversión por Tipo de Mercado' },
    ],
    []
  );

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Stack direction="row" gap="sm" align="center" justify="center" className="py-8">
            <Spinner size="sm" />
            <Text color="secondary">Cargando métricas...</Text>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        <Text>Error al cargar métricas: {error}</Text>
      </Alert>
    );
  }

  if (!metricsData) {
    return null;
  }

  // AI_DECISION: Changed layout to side-by-side grid
  // Justificación: Optimized space usage for dashboard
  // Impacto: Metric cards on left/right of chart depending on screen size, better information density
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Gráfico principal - 8 columnas en LG */}
      <div className="lg:col-span-8">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle>Métricas del Mes</CardTitle>
            <div className="w-56">
              <Select
                items={chartItems}
                value={chartView}
                onValueChange={(value) => setChartView(value as ChartView)}
                className="text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {chartView === 'goals' && (
                <GoalsComparisonChart currentMonth={metricsData} goals={goalsData} />
              )}
              {chartView === 'businessLines' && (
                <BusinessLineChart businessLineClosures={metricsData.businessLineClosures} />
              )}
              {chartView === 'transitionTimes' && (
                <TransitionTimesChart transitionTimes={metricsData.transitionTimes} />
              )}
              {chartView === 'marketConversion' && (
                <MarketTypeConversionChart
                  marketTypeConversion={metricsData.marketTypeConversion}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de métricas individuales - 4 columnas en LG */}
      {/* AI_DECISION: 2x2 Grid for Metric Cards to reduce vertical space */}
      <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title="Nuevos Contactos"
          actual={metricsData.newProspects}
          goal={goalsData?.newProspectsGoal ?? 0}
          color={METRIC_COLORS['Nuevos Contactos']}
          index={0}
        />
        <MetricCard
          title="Primeras Reuniones"
          actual={metricsData.firstMeetings}
          goal={goalsData?.firstMeetingsGoal ?? 0}
          color={METRIC_COLORS['Primeras Reuniones']}
          index={1}
        />
        <MetricCard
          title="Segundas Reuniones"
          actual={metricsData.secondMeetings}
          goal={goalsData?.secondMeetingsGoal ?? 0}
          color={METRIC_COLORS['Segundas Reuniones']}
          index={2}
        />
        <MetricCard
          title="Nuevos Clientes"
          actual={metricsData.newClients}
          goal={goalsData?.newClientsGoal ?? 0}
          color={METRIC_COLORS['Nuevos Clientes']}
          index={3}
        />
      </div>
    </div>
  );
}
