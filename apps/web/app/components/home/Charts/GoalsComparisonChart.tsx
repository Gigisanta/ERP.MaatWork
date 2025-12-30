'use client';

import { useMemo, memo } from 'react';
import {
  LazyBarChart,
  LazyResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from '@/components/charts/LazyChartWrapper';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

interface GoalsComparisonChartProps {
  currentMonth: MonthlyMetrics;
  goals: MonthlyGoal | null;
}

// Mapeo de métricas a colores usando variables CSS del sistema de diseño
const METRIC_COLORS = {
  'Nuevos Contactos': 'var(--color-chart-1)', // Azul
  'Primeras Reuniones': 'var(--color-chart-3)', // Amarillo/Naranja
  'Segundas Reuniones': '#f97316', // Naranja (no hay variable equivalente)
  'Nuevos Clientes': 'var(--color-chart-2)', // Verde
} as const;

/**
 * Gráfico de barras comparando valores actuales vs objetivos mensuales
 *
 * AI_DECISION: Memoize chart component to prevent unnecessary re-renders
 * Justificación: Recharts rendering is expensive, memoization prevents re-rendering on parent updates
 * Impacto: Better dashboard performance, reduced CPU cycles
 */
export const GoalsComparisonChart = memo(function GoalsComparisonChart({
  currentMonth,
  goals,
}: GoalsComparisonChartProps) {
  const chartData = useMemo(
    () => [
      {
        name: 'Nuevos Contactos',
        actual: currentMonth.newProspects,
        goal: goals?.newProspectsGoal ?? 0,
        color: METRIC_COLORS['Nuevos Contactos'],
      },
      {
        name: 'Primeras Reuniones',
        actual: currentMonth.firstMeetings,
        goal: goals?.firstMeetingsGoal ?? 0,
        color: METRIC_COLORS['Primeras Reuniones'],
      },
      {
        name: 'Segundas Reuniones',
        actual: currentMonth.secondMeetings,
        goal: goals?.secondMeetingsGoal ?? 0,
        color: METRIC_COLORS['Segundas Reuniones'],
      },
      {
        name: 'Nuevos Clientes',
        actual: currentMonth.newClients,
        goal: goals?.newClientsGoal ?? 0,
        color: METRIC_COLORS['Nuevos Clientes'],
      },
    ],
    [currentMonth, goals]
  );

  return (
    <LazyResponsiveContainer width="100%" height={250}>
      <LazyBarChart
        data={chartData}
        aria-label="Gráfico de comparación de objetivos vs actuales"
        barGap={0}
        barCategoryGap="20%"
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-border)"
          opacity={0.5}
        />
        <XAxis
          dataKey="name"
          fontSize={10}
          tick={{ fill: 'var(--color-text-secondary)' }}
          axisLine={false}
          tickLine={false}
          dy={8}
        />
        <YAxis
          fontSize={10}
          tick={{ fill: 'var(--color-text-secondary)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text)',
            fontSize: '12px',
            padding: '8px 12px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          fontSize={11}
          wrapperStyle={{ paddingTop: '10px' }}
        />
        <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]} maxBarSize={50}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
        <Bar
          dataKey="goal"
          name="Objetivo"
          fill="var(--color-surface-hover)"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </LazyBarChart>
    </LazyResponsiveContainer>
  );
});
