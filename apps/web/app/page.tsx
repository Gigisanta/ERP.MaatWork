"use client";
// REGLA CURSOR: Página principal - mantener AuthContext, no eliminar loading states, preservar feedback visual
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, Button, Icon, Heading, Text, Stack, Spinner, Alert, Select, type SelectItem } from '@cactus/ui';
import { getContactsMetrics, getMonthlyGoals } from '@/lib/api/metrics';
import type { MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

// Mapeo de métricas a colores de etapas del pipeline
const METRIC_COLORS = {
  'Nuevos Contactos': '#3b82f6', // Prospecto - Azul
  'Primeras Reuniones': '#f59e0b', // Primera reunion - Amarillo/Naranja
  'Segundas Reuniones': '#f97316', // Segunda reunion - Naranja
  'Nuevos Clientes': '#10b981', // Cliente - Verde
} as const;

type ChartView = 'goals' | 'businessLines' | 'transitionTimes';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [metricsData, setMetricsData] = useState<MonthlyMetrics | null>(null);
  const [goalsData, setGoalsData] = useState<MonthlyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<ChartView>('goals');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [metricsResponse, goalsResponse] = await Promise.all([
          getContactsMetrics(),
          getMonthlyGoals()
        ]);

        if (!metricsResponse.success || !metricsResponse.data) {
          throw new Error('Failed to fetch metrics data');
        }

        setMetricsData(metricsResponse.data.currentMonth);
        setGoalsData(goalsResponse.success && goalsResponse.data ? goalsResponse.data : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Componente para el gráfico de comparación
  function GoalsComparisonChart({ currentMonth, goals }: { currentMonth: MonthlyMetrics; goals: MonthlyGoal | null }) {
    const chartData = [
      {
        name: 'Nuevos Contactos',
        actual: currentMonth.newProspects,
        goal: goals?.newProspectsGoal ?? 0,
        color: METRIC_COLORS['Nuevos Contactos']
      },
      {
        name: 'Primeras Reuniones',
        actual: currentMonth.firstMeetings,
        goal: goals?.firstMeetingsGoal ?? 0,
        color: METRIC_COLORS['Primeras Reuniones']
      },
      {
        name: 'Segundas Reuniones',
        actual: currentMonth.secondMeetings,
        goal: goals?.secondMeetingsGoal ?? 0,
        color: METRIC_COLORS['Segundas Reuniones']
      },
      {
        name: 'Nuevos Clientes',
        actual: currentMonth.newClients,
        goal: goals?.newClientsGoal ?? 0,
        color: METRIC_COLORS['Nuevos Clientes']
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
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          <Bar
            dataKey="goal"
            name="Objetivo"
            fill="#94a3b8"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Componente para gráfico de cierres por línea de negocio
  function BusinessLineChart({ businessLineClosures }: { businessLineClosures: MonthlyMetrics['businessLineClosures'] }) {
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

  // Componente para gráfico de tiempo promedio entre avances
  function TransitionTimesChart({ transitionTimes }: { transitionTimes: MonthlyMetrics['transitionTimes'] }) {
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

  // Componente para las cards de métricas individuales
  function MetricCard({ 
    title, 
    actual, 
    goal,
    color 
  }: { 
    title: string; 
    actual: number; 
    goal: number;
    color: string;
  }) {
    // Convertir hex a rgba para background sutil
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
      <Card 
        className="relative overflow-hidden"
        style={{
          borderTop: `3px solid ${color}`,
          backgroundColor: hexToRgba(color, 0.05)
        }}
      >
        <CardContent className="p-4">
          <Stack direction="column" gap="xs">
            <Text size="sm" color="secondary" className="font-medium">
              {title}
            </Text>
            <Text size="xl" className="font-bold" style={{ color }}>
              {actual}
            </Text>
            <Text size="xs" color="secondary">
              Objetivo: {goal}
            </Text>
          </Stack>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      {!user ? (
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <Heading level={1}>Cactus CRM</Heading>
            </CardHeader>
            <CardContent>
              <Stack direction="column" gap="md">
                <Text color="secondary">
                  Gestiona tus contactos y carteras de inversión de manera profesional
                </Text>
                <Button variant="primary" onClick={() => router.push('/login')}>
                  Iniciar sesión
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Stack direction="column" gap="lg">
          {/* Tarjetas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Contactos */}
            <Card>
              <Link href="/contacts" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="Users" size={16} />
                      <Heading level={3} size="sm">Contactos</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Gestiona tu red de clientes
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>

            {/* Carteras */}
            <Card>
              <Link href="/portfolios" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="BarChart3" size={16} />
                      <Heading level={3} size="sm">Carteras</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Analiza el rendimiento de tus carteras
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>

            {/* Administración */}
            <Card>
              <Link href="/admin" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="Settings" size={16} />
                      <Heading level={3} size="sm">Administración</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Administra usuarios y permisos del sistema
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>

            {/* Equipos */}
            <Card>
              <Link href="/teams" className="block no-underline">
                <CardContent>
                  <Stack direction="column" gap="sm">
                    <Stack direction="row" gap="sm" align="center">
                      <Icon name="Users" size={16} />
                      <Heading level={3} size="sm">Equipos</Heading>
                    </Stack>
                    <Text size="sm" color="secondary">
                      Crea y gestiona equipos de trabajo
                    </Text>
                  </Stack>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Sección de métricas - solo mostrar si hay usuario autenticado */}
          {user && (
            <>
              {/* Sección 1: Gráfico Objetivos vs Actuales */}
              {loading ? (
                <Card>
                  <CardContent>
                    <Stack direction="row" gap="md" align="center" justify="center">
                      <Spinner size="sm" />
                      <Text color="secondary">Cargando métricas...</Text>
                    </Stack>
                  </CardContent>
                </Card>
              ) : error ? (
                <Alert variant="error">
                  <Text>Error al cargar métricas: {error}</Text>
                </Alert>
              ) : metricsData ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle>Objetivos vs Actuales</CardTitle>
                    <div className="w-64">
                      <Select
                        items={[
                          { value: 'goals', label: 'Objetivos vs Actuales' },
                          { value: 'businessLines', label: 'Cierres por Línea de Negocio' },
                          { value: 'transitionTimes', label: 'Tiempo Promedio entre Avances' }
                        ] as SelectItem[]}
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
              ) : null}

              {/* Sección 2: Grid de métricas individuales */}
              {loading ? null : error ? null : metricsData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    title="Nuevos Contactos"
                    actual={metricsData.newProspects}
                    goal={goalsData?.newProspectsGoal ?? 0}
                    color={METRIC_COLORS['Nuevos Contactos']}
                  />
                  <MetricCard
                    title="Primeras Reuniones"
                    actual={metricsData.firstMeetings}
                    goal={goalsData?.firstMeetingsGoal ?? 0}
                    color={METRIC_COLORS['Primeras Reuniones']}
                  />
                  <MetricCard
                    title="Segundas Reuniones"
                    actual={metricsData.secondMeetings}
                    goal={goalsData?.secondMeetingsGoal ?? 0}
                    color={METRIC_COLORS['Segundas Reuniones']}
                  />
                  <MetricCard
                    title="Nuevos Clientes"
                    actual={metricsData.newClients}
                    goal={goalsData?.newClientsGoal ?? 0}
                    color={METRIC_COLORS['Nuevos Clientes']}
                  />
                </div>
              ) : null}
            </>
          )}
        </Stack>
      )}
    </div>
  );
}