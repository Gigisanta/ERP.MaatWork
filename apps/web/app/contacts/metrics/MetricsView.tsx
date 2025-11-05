"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getContactsMetrics, getMonthlyGoals, saveMonthlyGoals } from '@/lib/api/metrics';
import type { ContactsMetricsResponse, MonthlyMetrics, MonthlyGoal } from '@/types/metrics';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  Select,
  Spinner,
  Alert,
  Icon,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ModalTitle
} from '@cactus/ui';
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

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

// ==========================================================
// Chart Components
// ==========================================================

interface MetricsTrendChartProps {
  history: MonthlyMetrics[];
}

function MetricsTrendChart({ history }: MetricsTrendChartProps) {
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

function GoalsComparisonChart({ currentMonth, goals }: GoalsComparisonChartProps) {
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

function BusinessLineChart({ businessLineClosures }: BusinessLineChartProps) {
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

function TransitionTimesChart({ transitionTimes }: TransitionTimesChartProps) {
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

export default function MetricsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ContactsMetricsResponse | null>(null);
  const [goals, setGoals] = useState<MonthlyGoal | null>(null);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [goalForm, setGoalForm] = useState({
    newProspectsGoal: 0,
    firstMeetingsGoal: 0,
    secondMeetingsGoal: 0,
    newClientsGoal: 0
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsResponse, goalsResponse] = await Promise.all([
        getContactsMetrics(selectedMonth, selectedYear),
        getMonthlyGoals(selectedMonth, selectedYear)
      ]);

      if (metricsResponse.success && metricsResponse.data) {
        setMetrics(metricsResponse.data);
      } else {
        setError('Error al cargar métricas');
      }

      if (goalsResponse.success) {
        setGoals(goalsResponse.data ?? null);
        if (goalsResponse.data) {
          setGoalForm({
            newProspectsGoal: goalsResponse.data.newProspectsGoal,
            firstMeetingsGoal: goalsResponse.data.firstMeetingsGoal,
            secondMeetingsGoal: goalsResponse.data.secondMeetingsGoal,
            newClientsGoal: goalsResponse.data.newClientsGoal
          });
        } else {
          setGoalForm({
            newProspectsGoal: 0,
            firstMeetingsGoal: 0,
            secondMeetingsGoal: 0,
            newClientsGoal: 0
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await saveMonthlyGoals({
        month: selectedMonth,
        year: selectedYear,
        ...goalForm
      });

      if (response.success && response.data) {
        setGoals(response.data);
        setGoalsModalOpen(false);
        setGoalForm({
          newProspectsGoal: response.data.newProspectsGoal,
          firstMeetingsGoal: response.data.firstMeetingsGoal,
          secondMeetingsGoal: response.data.secondMeetingsGoal,
          newClientsGoal: response.data.newClientsGoal
        });
      } else {
        setError('Error al guardar objetivos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const currentMonth = metrics?.currentMonth;

  const getProgressPercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min(100, Math.round((current / goal) * 100));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Heading size="lg">Métricas del Pipeline</Heading>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGoalsModalOpen(true)}
              className="h-6 px-2 text-xs text-text-secondary hover:text-text"
            >
              <Icon name="edit" size={12} className="mr-1" />
              Editar objetivos
            </Button>
          </div>
          <Text color="secondary">Seguimiento de prospectos, reuniones y cierres</Text>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border bg-surface">
            <Select
              label="Mes"
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(Number(value))}
              items={MONTH_NAMES.map((name, idx) => ({
                value: (idx + 1).toString(),
                label: name
              }))}
              className="w-32"
            />
            <div className="w-24">
              <Text size="sm" weight="medium" className="mb-1.5">Año</Text>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min={2000}
                max={2100}
                className="w-full"
              />
            </div>
          </div>
          <Button variant="secondary" onClick={() => router.push('/contacts')}>
            <Icon name="ChevronLeft" size={16} className="mr-2" />
            Volver a Contactos
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {currentMonth && (
        <>
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Nuevos Contactos"
              value={currentMonth.newProspects}
              goal={goalForm.newProspectsGoal}
            />
            <MetricCard
              title="Primeras Reuniones"
              value={currentMonth.firstMeetings}
              goal={goalForm.firstMeetingsGoal}
            />
            <MetricCard
              title="Segundas Reuniones"
              value={currentMonth.secondMeetings}
              goal={goalForm.secondMeetingsGoal}
            />
            <MetricCard
              title="Nuevos Clientes"
              value={currentMonth.newClients}
              goal={goalForm.newClientsGoal}
            />
          </div>

          {/* Gráfico de Tendencia Temporal */}
          {metrics?.history && metrics.history.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Tendencia Temporal</CardTitle>
              </CardHeader>
              <CardContent>
                <MetricsTrendChart history={metrics.history} />
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
              <BusinessLineChart businessLineClosures={currentMonth.businessLineClosures} />
            </CardContent>
          </Card>

          {/* Tiempos entre avances */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Tiempo Promedio entre Avances</CardTitle>
            </CardHeader>
            <CardContent>
              <TransitionTimesChart transitionTimes={currentMonth.transitionTimes} />
            </CardContent>
          </Card>

          {/* Link al historial */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                onClick={() => router.push('/contacts/metrics/history')}
                className="w-full"
              >
                <Icon name="BarChart3" size={16} className="mr-2" />
                Ver Historial Completo de Meses
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de edición de objetivos */}
      <Modal
        open={goalsModalOpen}
        onOpenChange={setGoalsModalOpen}
        size="md"
      >
        <ModalHeader>
          <ModalTitle>Editar Objetivos Mensuales</ModalTitle>
          <Text size="sm" color="secondary">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </Text>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <Input
              type="number"
              label="Nuevos Contactos"
              value={goalForm.newProspectsGoal}
              onChange={(e) => setGoalForm({ ...goalForm, newProspectsGoal: Number(e.target.value) })}
              min={0}
            />
            <Input
              type="number"
              label="Primeras Reuniones"
              value={goalForm.firstMeetingsGoal}
              onChange={(e) => setGoalForm({ ...goalForm, firstMeetingsGoal: Number(e.target.value) })}
              min={0}
            />
            <Input
              type="number"
              label="Segundas Reuniones"
              value={goalForm.secondMeetingsGoal}
              onChange={(e) => setGoalForm({ ...goalForm, secondMeetingsGoal: Number(e.target.value) })}
              min={0}
            />
            <Input
              type="number"
              label="Nuevos Clientes"
              value={goalForm.newClientsGoal}
              onChange={(e) => setGoalForm({ ...goalForm, newClientsGoal: Number(e.target.value) })}
              min={0}
            />
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setGoalsModalOpen(false);
              if (goals) {
                setGoalForm({
                  newProspectsGoal: goals.newProspectsGoal,
                  firstMeetingsGoal: goals.firstMeetingsGoal,
                  secondMeetingsGoal: goals.secondMeetingsGoal,
                  newClientsGoal: goals.newClientsGoal
                });
              }
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleSaveGoals} disabled={saving}>
            {saving ? <Spinner size="sm" /> : 'Guardar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  goal: number;
}

function MetricCard({ title, value, goal }: MetricCardProps) {
  const progress = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="sm">
          <Heading size="xl">{value}</Heading>
          <Text size="sm" color="secondary">
            Objetivo: {goal}
          </Text>
          {goal > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

