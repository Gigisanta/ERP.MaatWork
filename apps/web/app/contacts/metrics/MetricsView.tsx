'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getContactsMetrics, getMonthlyGoals, saveMonthlyGoals } from '@/lib/api/metrics';
import type { ContactsMetricsResponse, MonthlyGoal } from '@/types/metrics';
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
  ModalTitle,
} from '@maatwork/ui';
// AI_DECISION: Lazy load recharts components to reduce initial bundle size
// Justificación: recharts is a heavy library (~50-80KB), loading it async reduces initial bundle significantly
// Impacto: Faster initial page load, smaller initial JavaScript bundle for metrics page
const MetricsCharts = dynamic(() => import('./MetricsCharts'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Spinner size="md" />
      <Text color="secondary" className="ml-2">
        Cargando gráficos...
      </Text>
    </div>
  ),
  ssr: false,
});

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

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
    newClientsGoal: 0,
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
        getMonthlyGoals(selectedMonth, selectedYear),
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
            newClientsGoal: goalsResponse.data.newClientsGoal,
          });
        } else {
          setGoalForm({
            newProspectsGoal: 0,
            firstMeetingsGoal: 0,
            secondMeetingsGoal: 0,
            newClientsGoal: 0,
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
        ...goalForm,
      });

      if (response.success && response.data) {
        setGoals(response.data);
        setGoalsModalOpen(false);
        setGoalForm({
          newProspectsGoal: response.data.newProspectsGoal,
          firstMeetingsGoal: response.data.firstMeetingsGoal,
          secondMeetingsGoal: response.data.secondMeetingsGoal,
          newClientsGoal: response.data.newClientsGoal,
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
              onValueChange={(value: string) => setSelectedMonth(Number(value))}
              items={MONTH_NAMES.map((name, idx) => ({
                value: (idx + 1).toString(),
                label: name,
              }))}
              className="w-32"
            />
            <div className="w-24">
              <Text size="sm" weight="medium" className="mb-1.5">
                Año
              </Text>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedYear(Number(e.target.value))}
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

          {/* Charts - Lazy loaded */}
          <MetricsCharts
            history={metrics?.history ?? []}
            currentMonth={currentMonth}
            goals={goals}
            businessLineClosures={currentMonth.businessLineClosures}
            transitionTimes={currentMonth.transitionTimes}
            marketTypeConversion={currentMonth.marketTypeConversion}
          />

          {/* Average Interactions by Stage */}
          {metrics?.averageInteractions && metrics.averageInteractions.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Promedio de Interacciones por Etapa</CardTitle>
                <Text size="sm" color="secondary">
                  Número promedio de interacciones por contacto en cada etapa
                </Text>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.averageInteractions.map((item) => (
                    <div
                      key={item.stageId}
                      className="p-4 rounded-lg border border-border bg-surface"
                    >
                      <Text size="sm" color="secondary" className="mb-1">
                        {item.stageName}
                      </Text>
                      <Heading size="lg">{item.averageInteractions.toFixed(1)}</Heading>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
      <Modal open={goalsModalOpen} onOpenChange={setGoalsModalOpen} size="md">
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalForm({ ...goalForm, newProspectsGoal: Number(e.target.value) })}
              min={0}
            />
            <Input
              type="number"
              label="Primeras Reuniones"
              value={goalForm.firstMeetingsGoal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalForm({ ...goalForm, firstMeetingsGoal: Number(e.target.value) })}
              min={0}
            />
            <Input
              type="number"
              label="Segundas Reuniones"
              value={goalForm.secondMeetingsGoal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalForm({ ...goalForm, secondMeetingsGoal: Number(e.target.value) })}
              min={0}
            />
            <Input
              type="number"
              label="Nuevos Clientes"
              value={goalForm.newClientsGoal}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalForm({ ...goalForm, newClientsGoal: Number(e.target.value) })}
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
                  newClientsGoal: goals.newClientsGoal,
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
                  progress >= 100
                    ? 'bg-green-500'
                    : progress >= 75
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
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
