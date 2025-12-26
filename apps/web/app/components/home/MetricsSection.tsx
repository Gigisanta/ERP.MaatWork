'use client';

import { useState, useMemo } from 'react';
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
} from '@maatwork/ui';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { MetricCard } from './MetricCard';
import { GoalsComparisonChart } from './Charts/GoalsComparisonChart';
import { BusinessLineChart } from './Charts/BusinessLineChart';
import { TransitionTimesChart } from './Charts/TransitionTimesChart';
import { MarketTypeConversionChart } from './Charts/MarketTypeConversionChart';

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
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Stack direction="column" gap="md" align="center">
            <Text color="secondary" italic>
              No hay datos de métricas disponibles para el período seleccionado.
            </Text>
            {error && (
              <Alert variant="error" className="max-w-md mx-auto">
                <Text size="sm">{error}</Text>
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
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
