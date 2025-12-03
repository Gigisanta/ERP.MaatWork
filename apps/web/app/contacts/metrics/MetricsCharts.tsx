'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Text } from '@cactus/ui';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

const MONTH_NAMES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

// AI_DECISION: Extract chart components to separate file for lazy loading
// Justificación: recharts is a heavy library (~50-80KB), separating charts allows lazy loading
// Impacto: Reduces initial bundle size for metrics page, faster initial load

interface MetricsTrendChartProps {
  history: MonthlyMetrics[];
}

export function MetricsTrendChart({ history }: MetricsTrendChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Text color="secondary">No hay datos históricos disponibles</Text>
      </div>
    );
  }

  const chartData = history
    .slice()
    .reverse()
    .map((month) => ({
      monthYear: `${MONTH_NAMES_SHORT[month.month - 1]} ${month.year}`,
      newProspects: month.newProspects,
      firstMeetings: month.firstMeetings,
      secondMeetings: month.secondMeetings,
      newClients: month.newClients,
    }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="monthYear"
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
        />
        <YAxis fontSize={12} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="newProspects"
          name="Nuevos Contactos"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-1)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="firstMeetings"
          name="Primeras Reuniones"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-2)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="secondMeetings"
          name="Segundas Reuniones"
          stroke="var(--color-chart-3)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-3)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="newClients"
          name="Nuevos Clientes"
          stroke="var(--color-chart-4)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-chart-4)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface GoalsComparisonChartProps {
  currentMonth: MonthlyMetrics;
  goals: MonthlyGoal | null;
}

export function GoalsComparisonChart({ currentMonth, goals }: GoalsComparisonChartProps) {
  const chartData = [
    {
      name: 'Nuevos Contactos',
      actual: currentMonth.newProspects,
      goal: goals?.newProspectsGoal ?? 0,
    },
    {
      name: 'Primeras Reuniones',
      actual: currentMonth.firstMeetings,
      goal: goals?.firstMeetingsGoal ?? 0,
    },
    {
      name: 'Segundas Reuniones',
      actual: currentMonth.secondMeetings,
      goal: goals?.secondMeetingsGoal ?? 0,
    },
    {
      name: 'Nuevos Clientes',
      actual: currentMonth.newClients,
      goal: goals?.newClientsGoal ?? 0,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis fontSize={12} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar dataKey="actual" name="Actual" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="goal" name="Objetivo" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface BusinessLineChartProps {
  businessLineClosures: MonthlyMetrics['businessLineClosures'];
}

export function BusinessLineChart({ businessLineClosures }: BusinessLineChartProps) {
  const chartData = [
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
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={12} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <YAxis fontSize={12} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="value" name="Cierres" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MarketTypeConversionChartProps {
  marketTypeConversion: MonthlyMetrics['marketTypeConversion'];
}

export function MarketTypeConversionChart({
  marketTypeConversion,
}: MarketTypeConversionChartProps) {
  const chartData = [
    {
      name: 'Natural',
      contactos: marketTypeConversion.natural.contacts,
      clientes: marketTypeConversion.natural.clients,
    },
    {
      name: 'Referido',
      contactos: marketTypeConversion.referido.contacts,
      clientes: marketTypeConversion.referido.clients,
    },
    {
      name: 'Frío (Total)',
      contactos: marketTypeConversion.frio.contacts,
      clientes: marketTypeConversion.frio.clients,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={12} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <YAxis fontSize={12} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string) => {
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
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ColdMarketBreakdownChartProps {
  breakdown: MonthlyMetrics['marketTypeConversion']['frio']['breakdown'];
}

export function ColdMarketBreakdownChart({ breakdown }: ColdMarketBreakdownChartProps) {
  const chartData = [
    {
      name: 'Redes Sociales',
      contactos: breakdown.redesSociales.contacts,
      clientes: breakdown.redesSociales.clients,
    },
    {
      name: 'Llamado en Frío',
      contactos: breakdown.llamadoFrio.contacts,
      clientes: breakdown.llamadoFrio.clients,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <YAxis fontSize={11} tick={{ fill: 'var(--color-foreground-secondary)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Bar
          dataKey="contactos"
          name="Contactos"
          fill="var(--color-chart-3)"
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="clientes" name="Clientes" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TransitionTimesChartProps {
  transitionTimes: MonthlyMetrics['transitionTimes'];
}

export function TransitionTimesChart({ transitionTimes }: TransitionTimesChartProps) {
  const chartData = [
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
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
          label={{ value: 'Días', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
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
          }}
        />
        <Bar dataKey="value" name="Días" fill="var(--color-chart-4)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MetricsChartsProps {
  history: MonthlyMetrics[];
  currentMonth: MonthlyMetrics;
  goals: MonthlyGoal | null;
  businessLineClosures: MonthlyMetrics['businessLineClosures'];
  transitionTimes: MonthlyMetrics['transitionTimes'];
  marketTypeConversion: MonthlyMetrics['marketTypeConversion'];
}

export default function MetricsCharts({
  history,
  currentMonth,
  goals,
  businessLineClosures,
  transitionTimes,
  marketTypeConversion,
}: MetricsChartsProps) {
  return (
    <>
      {/* Gráfico de Tendencia Temporal */}
      {history && history.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tendencia Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsTrendChart history={history} />
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Objetivos vs Actuales */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Objetivos vs Actuales</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalsComparisonChart currentMonth={currentMonth} goals={goals} />
        </CardContent>
      </Card>

      {/* Gráfico de Cierres por Línea de Negocio */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cierres por Línea de Negocio</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessLineChart businessLineClosures={businessLineClosures} />
        </CardContent>
      </Card>

      {/* Gráfico de Conversión por Tipo de Mercado */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contactos vs Clientes por Tipo de Mercado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <MarketTypeConversionChart marketTypeConversion={marketTypeConversion} />
          </div>

          {/* Tarjetas de resumen por tipo */}
          <div className="grid grid-cols-3 gap-4 text-center mb-6">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <Text size="sm" color="secondary" className="text-green-700">
                Natural
              </Text>
              <Text size="lg" weight="semibold" className="text-green-900">
                {marketTypeConversion.natural.conversionRate}%
              </Text>
              <Text size="xs" color="secondary" className="text-green-600">
                {marketTypeConversion.natural.clients} de {marketTypeConversion.natural.contacts}
              </Text>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <Text size="sm" color="secondary" className="text-blue-700">
                Referido
              </Text>
              <Text size="lg" weight="semibold" className="text-blue-900">
                {marketTypeConversion.referido.conversionRate}%
              </Text>
              <Text size="xs" color="secondary" className="text-blue-600">
                {marketTypeConversion.referido.clients} de {marketTypeConversion.referido.contacts}
              </Text>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <Text size="sm" color="secondary" className="text-orange-700">
                Frío (Total)
              </Text>
              <Text size="lg" weight="semibold" className="text-orange-900">
                {marketTypeConversion.frio.conversionRate}%
              </Text>
              <Text size="xs" color="secondary" className="text-orange-600">
                {marketTypeConversion.frio.clients} de {marketTypeConversion.frio.contacts}
              </Text>
            </div>
          </div>

          {/* Desglose de mercado frío */}
          {(marketTypeConversion.frio.breakdown.redesSociales.contacts > 0 ||
            marketTypeConversion.frio.breakdown.llamadoFrio.contacts > 0) && (
            <div className="border-t border-gray-200 pt-4">
              <Text size="sm" weight="semibold" className="mb-3">
                Desglose Mercado Frío
              </Text>
              <ColdMarketBreakdownChart breakdown={marketTypeConversion.frio.breakdown} />
              <div className="grid grid-cols-2 gap-4 text-center mt-4">
                <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                  <Text size="xs" color="secondary" className="text-purple-700">
                    Redes Sociales
                  </Text>
                  <Text size="base" weight="semibold" className="text-purple-900">
                    {marketTypeConversion.frio.breakdown.redesSociales.conversionRate}%
                  </Text>
                  <Text size="xs" color="secondary" className="text-purple-600">
                    {marketTypeConversion.frio.breakdown.redesSociales.clients} de{' '}
                    {marketTypeConversion.frio.breakdown.redesSociales.contacts}
                  </Text>
                </div>
                <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200">
                  <Text size="xs" color="secondary" className="text-indigo-700">
                    Llamado en Frío
                  </Text>
                  <Text size="base" weight="semibold" className="text-indigo-900">
                    {marketTypeConversion.frio.breakdown.llamadoFrio.conversionRate}%
                  </Text>
                  <Text size="xs" color="secondary" className="text-indigo-600">
                    {marketTypeConversion.frio.breakdown.llamadoFrio.clients} de{' '}
                    {marketTypeConversion.frio.breakdown.llamadoFrio.contacts}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tiempos entre avances */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tiempo Promedio entre Avances</CardTitle>
        </CardHeader>
        <CardContent>
          <TransitionTimesChart transitionTimes={transitionTimes} />
        </CardContent>
      </Card>
    </>
  );
}
