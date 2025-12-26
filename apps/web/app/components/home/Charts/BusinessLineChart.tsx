'use client';

import { useMemo, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyMetrics } from '@/types/metrics';

interface BusinessLineChartProps {
  businessLineClosures: MonthlyMetrics['businessLineClosures'];
}

/**
 * Gráfico de barras mostrando cierres por línea de negocio
 * 
 * AI_DECISION: Memoize chart component to prevent unnecessary re-renders
 * Justificación: Charts are heavy to render, memoization reduces CPU usage on dashboard updates
 * Impacto: Smoother dashboard interactions, reduced re-render frequency
 */
export const BusinessLineChart = memo(function BusinessLineChart({ businessLineClosures }: BusinessLineChartProps) {
  const chartData = useMemo(
    () => [
      {
        name: 'Inversiones',
        value: businessLineClosures.inversiones,
      },
      {
        name: 'Zurich',
        value: businessLineClosures.zurich,
      },
      {
        name: 'Patrimonial',
        value: businessLineClosures.patrimonial,
      },
    ],
    [businessLineClosures]
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} aria-label="Gráfico de cierres por línea de negocio">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--color-text-secondary)' }} />
        <YAxis fontSize={11} tick={{ fill: 'var(--color-text-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text)',
          }}
        />
        <Bar dataKey="value" name="Cierres" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});
