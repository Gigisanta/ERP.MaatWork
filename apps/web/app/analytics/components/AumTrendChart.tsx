'use client';

import dynamic from 'next/dynamic';
import type { AumTrendItem } from '@/types';

// AI_DECISION: Lazy load Recharts to reduce initial bundle size
// Justificación: Recharts is heavy (~200KB), loading it async reduces initial bundle significantly
// Impacto: Faster initial page load, smaller initial JavaScript bundle (~200KB reduction)
const RechartsChart = dynamic(
  () =>
    import('recharts').then((mod) => ({
      default: ({
        data,
        formatCurrency,
        formatDate,
      }: {
        data: AumTrendItem[];
        formatCurrency: (value: number) => string;
        formatDate: (date: string) => string;
      }) => {
        const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
              <YAxis tickFormatter={(value) => formatCurrency(value)} fontSize={12} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'AUM']}
                labelFormatter={(label) => `Fecha: ${formatDate(label)}`}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={{ fill: 'var(--color-chart-1)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'var(--color-chart-1)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      },
    })),
  {
    ssr: false,
    loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando gráfico...</div>,
  }
);

interface AumTrendChartProps {
  data: AumTrendItem[];
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

export default function AumTrendChart({ data, formatCurrency, formatDate }: AumTrendChartProps) {
  return <RechartsChart data={data} formatCurrency={formatCurrency} formatDate={formatDate} />;
}
