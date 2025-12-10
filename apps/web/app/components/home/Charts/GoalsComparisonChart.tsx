'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
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
 */
export function GoalsComparisonChart({ currentMonth, goals }: GoalsComparisonChartProps) {
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
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} aria-label="Gráfico de comparación de objetivos vs actuales">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="name"
          fontSize={11}
          tick={{ fill: 'var(--color-text-secondary)' }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis fontSize={11} tick={{ fill: 'var(--color-text-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text)',
          }}
        />
        <Legend />
        <Bar dataKey="actual" name="Actual" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
        <Bar dataKey="goal" name="Objetivo" fill="var(--color-text-muted)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
