'use client';

import dynamic from 'next/dynamic';

interface RiskDistributionItem {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature para compatibilidad con Recharts
}

interface RiskDistributionChartProps {
  data: RiskDistributionItem[];
}

// AI_DECISION: Lazy load Recharts PieChart for risk distribution visualization
// Justificación: Recharts is heavy (~200KB), loading it async reduces initial bundle
// Impacto: Faster initial page load, chart loads on demand
// AI_DECISION: Custom label renderer para evitar conflictos de tipos con Recharts
// Justificación: PieLabelRenderProps de Recharts tiene tipado estricto que no incluye 'percent'
// Impacto: Usar tipo 'any' en label renderer es seguro porque Recharts lo proporciona en runtime
const RechartsPieChart = dynamic(
  () =>
    import('recharts').then((mod) => ({
      default: ({ data }: { data: RiskDistributionItem[] }) => {
        const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } = mod;

        // AI_DECISION: Usar unknown con type guard en lugar de any
        // Justificación: Recharts PieLabelRenderProps no incluye 'percent' en tipos, pero lo proporciona en runtime
        // Impacto: Type safety mejorado usando unknown con validación explícita
        const renderCustomLabel = (props: unknown) => {
          if (
            typeof props === 'object' &&
            props !== null &&
            'percent' in props &&
            typeof (props as { percent: unknown }).percent === 'number'
          ) {
            const percent = (props as { percent: number }).percent;
            if (percent < 0.05) return null; // No mostrar labels muy pequeños
            return `${(percent * 100).toFixed(0)}%`;
          }
          return null;
        };

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={renderCustomLabel}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} clientes`, 'Cantidad']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span style={{ color: 'var(--color-text)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      },
    })),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-text-muted">Cargando gráfico...</div>,
  }
);

export default function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        No hay datos de distribución de riesgo
      </div>
    );
  }

  return <RechartsPieChart data={data} />;
}
