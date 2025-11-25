"use client";

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
  Grid,
  GridItem
} from '@cactus/ui';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import { GoalsComparisonChart } from './Charts/GoalsComparisonChart';
import { BusinessLineChart } from './Charts/BusinessLineChart';
import { TransitionTimesChart } from './Charts/TransitionTimesChart';
import { MetricCard } from './MetricCard';

interface MetricsSectionProps {
  metricsData: MonthlyMetrics | null;
  goalsData: MonthlyGoal | null;
  loading: boolean;
  error: string | null;
}

type ChartView = 'goals' | 'businessLines' | 'transitionTimes';

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

  const chartItems = useMemo<SelectItem[]>(() => [
    { value: 'goals', label: 'Objetivos vs Actuales' },
    { value: 'businessLines', label: 'Cierres por Línea de Negocio' },
    { value: 'transitionTimes', label: 'Tiempo Promedio entre Avances' }
  ], []);

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

  return (
    <Stack direction="column" gap="lg">
      {/* Gráfico principal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Métricas del Mes</CardTitle>
          <div className="w-64">
            <Select
              items={chartItems}
              value={chartView}
              onValueChange={(value) => setChartView(value as ChartView)}
              className="text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {chartView === 'goals' && (
            <GoalsComparisonChart currentMonth={metricsData} goals={goalsData} />
          )}
          {chartView === 'businessLines' && (
            <BusinessLineChart businessLineClosures={metricsData.businessLineClosures} />
          )}
          {chartView === 'transitionTimes' && (
            <TransitionTimesChart transitionTimes={metricsData.transitionTimes} />
          )}
        </CardContent>
      </Card>

      {/* Grid de métricas individuales */}
      <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="md">
        <GridItem>
          <MetricCard
            title="Nuevos Contactos"
            actual={metricsData.newProspects}
            goal={goalsData?.newProspectsGoal ?? 0}
            color={METRIC_COLORS['Nuevos Contactos']}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            title="Primeras Reuniones"
            actual={metricsData.firstMeetings}
            goal={goalsData?.firstMeetingsGoal ?? 0}
            color={METRIC_COLORS['Primeras Reuniones']}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            title="Segundas Reuniones"
            actual={metricsData.secondMeetings}
            goal={goalsData?.secondMeetingsGoal ?? 0}
            color={METRIC_COLORS['Segundas Reuniones']}
          />
        </GridItem>
        <GridItem>
          <MetricCard
            title="Nuevos Clientes"
            actual={metricsData.newClients}
            goal={goalsData?.newClientsGoal ?? 0}
            color={METRIC_COLORS['Nuevos Clientes']}
          />
        </GridItem>
      </Grid>
    </Stack>
  );
}

