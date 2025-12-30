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
} from '@/components/charts/LazyChartWrapper';
import type { MonthlyMetrics } from '@/types/metrics';

interface MarketTypeConversionChartProps {
  marketTypeConversion: MonthlyMetrics['marketTypeConversion'];
}

/**
 * Gráfico de barras mostrando conversión de contactos a clientes por tipo de mercado
 *
 * AI_DECISION: Memoize chart component to prevent unnecessary re-renders
 * Justificación: Charts are heavy components, memoization improves overall dashboard responsiveness
 * Impacto: Reduced rendering overhead, better user experience
 */
export const MarketTypeConversionChart = memo(function MarketTypeConversionChart({
  marketTypeConversion,
}: MarketTypeConversionChartProps) {
  const chartData = useMemo(
    () => [
      {
        name: 'Natural',
        contactos: marketTypeConversion.natural.contacts,
        clientes: marketTypeConversion.natural.clients,
        conversionRate: marketTypeConversion.natural.conversionRate,
      },
      {
        name: 'Referido',
        contactos: marketTypeConversion.referido.contacts,
        clientes: marketTypeConversion.referido.clients,
        conversionRate: marketTypeConversion.referido.conversionRate,
      },
      {
        name: 'Frío',
        contactos: marketTypeConversion.frio.contacts,
        clientes: marketTypeConversion.frio.clients,
        conversionRate: marketTypeConversion.frio.conversionRate,
      },
    ],
    [marketTypeConversion]
  );

  return (
    <LazyResponsiveContainer width="100%" height={220}>
      <LazyBarChart data={chartData} aria-label="Gráfico de conversión por tipo de mercado">
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
          formatter={(
            value: number,
            name: string,
            props: { payload?: { conversionRate?: number } }
          ) => {
            if (name === 'clientes' && props.payload?.conversionRate !== undefined) {
              return [`${value} (${props.payload.conversionRate}%)`, 'Clientes'];
            }
            return [value, name === 'contactos' ? 'Contactos' : 'Clientes'];
          }}
        />
        <Legend />
        <Bar
          dataKey="contactos"
          name="Contactos"
          fill="var(--color-chart-2)"
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="clientes" name="Clientes" fill="var(--color-chart-4)" radius={[4, 4, 0, 0]} />
      </LazyBarChart>
    </LazyResponsiveContainer>
  );
});
