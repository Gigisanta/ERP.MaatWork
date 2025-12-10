'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyMetrics } from '@/types/metrics';

interface TransitionTimesChartProps {
  transitionTimes: MonthlyMetrics['transitionTimes'];
}

/**
 * Gráfico de barras horizontales mostrando tiempo promedio entre avances en el pipeline
 */
export function TransitionTimesChart({ transitionTimes }: TransitionTimesChartProps) {
  const chartData = useMemo(
    () => [
      {
        name: 'Prospecto → Primera Reunión',
        value: transitionTimes.prospectoToFirstMeeting ?? 0,
        hasValue: transitionTimes.prospectoToFirstMeeting !== null,
      },
      {
        name: 'Primera → Segunda Reunión',
        value: transitionTimes.firstToSecondMeeting ?? 0,
        hasValue: transitionTimes.firstToSecondMeeting !== null,
      },
      {
        name: 'Segunda Reunión → Cliente',
        value: transitionTimes.secondMeetingToClient ?? 0,
        hasValue: transitionTimes.secondMeetingToClient !== null,
      },
    ],
    [transitionTimes]
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        layout="vertical"
        aria-label="Gráfico de tiempo promedio entre avances"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          type="number"
          fontSize={11}
          tick={{ fill: 'var(--color-text-secondary)' }}
          label={{ value: 'Días', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={11}
          tick={{ fill: 'var(--color-text-secondary)' }}
          width={200}
        />
        <Tooltip
          formatter={(
            value: number,
            _name: string,
            props: { payload?: { hasValue?: boolean } }
          ) => {
            if (!props.payload?.hasValue) return ['N/A', 'Días'];
            return [`${value} días`, 'Tiempo promedio'];
          }}
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text)',
          }}
        />
        <Bar dataKey="value" name="Días" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
