"use client";

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
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, Text } from '@cactus/ui';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
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
      newClients: month.newClients
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
        <YAxis
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px'
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
      goal: goals?.newProspectsGoal ?? 0
    },
    {
      name: 'Primeras Reuniones',
      actual: currentMonth.firstMeetings,
      goal: goals?.firstMeetingsGoal ?? 0
    },
    {
      name: 'Segundas Reuniones',
      actual: currentMonth.secondMeetings,
      goal: goals?.secondMeetingsGoal ?? 0
    },
    {
      name: 'Nuevos Clientes',
      actual: currentMonth.newClients,
      goal: goals?.newClientsGoal ?? 0
    }
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
        <YAxis
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar
          dataKey="actual"
          name="Actual"
          fill="var(--color-chart-1)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="goal"
          name="Objetivo"
          fill="var(--color-chart-2)"
          radius={[4, 4, 0, 0]}
        />
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
      value: businessLineClosures.inversiones
    },
    {
      name: 'Zurich',
      value: businessLineClosures.zurich
    },
    {
      name: 'Patrimonial',
      value: businessLineClosures.patrimonial
    }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
        />
        <YAxis
          fontSize={12}
          tick={{ fill: 'var(--color-foreground-secondary)' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px'
          }}
        />
        <Bar
          dataKey="value"
          name="Cierres"
          fill="var(--color-chart-1)"
          radius={[4, 4, 0, 0]}
        />
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
      hasValue: transitionTimes.prospectoToFirstMeeting !== null
    },
    {
      name: 'Primera → Segunda Reunión',
      value: transitionTimes.firstToSecondMeeting ?? 0,
      hasValue: transitionTimes.firstToSecondMeeting !== null
    },
    {
      name: 'Segunda Reunión → Cliente',
      value: transitionTimes.secondMeetingToClient ?? 0,
      hasValue: transitionTimes.secondMeetingToClient !== null
    }
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
          formatter={(value: number, _name: string, props: { payload?: { hasValue?: boolean } }) => {
            if (!props.payload?.hasValue) return ['N/A', 'Días'];
            return [`${value} días`, 'Tiempo promedio'];
          }}
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px'
          }}
        />
        <Bar
          dataKey="value"
          name="Días"
          fill="var(--color-chart-4)"
          radius={[0, 4, 4, 0]}
        />
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
}

export default function MetricsCharts({
  history,
  currentMonth,
  goals,
  businessLineClosures,
  transitionTimes
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

