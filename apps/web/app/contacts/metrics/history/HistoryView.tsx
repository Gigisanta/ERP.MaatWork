'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getContactsMetrics } from '@/lib/api/metrics';
import type { ContactsMetricsResponse, MonthlyMetrics } from '@/types/metrics';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Select,
  Spinner,
  Alert,
  Icon,
  DataTable,
} from '@maatwork/ui';
import type { Column } from '@maatwork/ui';

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

interface HistoryRow {
  id: string;
  monthYear: string;
  month: number;
  year: number;
  newProspects: number;
  firstMeetings: number;
  secondMeetings: number;
  newClients: number;
}

export default function HistoryView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ContactsMetricsResponse | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadData();
  }, [filterMonth, filterYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getContactsMetrics(filterMonth ?? undefined, filterYear ?? undefined);

      if (response.success && response.data) {
        setMetrics(response.data);
      } else {
        setError('Error al cargar historial');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const historyRows: HistoryRow[] = useMemo(() => {
    if (!metrics?.history) return [];

    return metrics.history.map((h: MonthlyMetrics) => ({
      id: `${h.year}-${h.month}`,
      monthYear: `${MONTH_NAMES[h.month - 1]} ${h.year}`,
      month: h.month,
      year: h.year,
      newProspects: h.newProspects,
      firstMeetings: h.firstMeetings,
      secondMeetings: h.secondMeetings,
      newClients: h.newClients,
    }));
  }, [metrics]);

  const filteredRows = useMemo(() => {
    return historyRows;
  }, [historyRows]);

  const columns: Column<HistoryRow>[] = [
    {
      key: 'monthYear',
      header: 'Mes/Año',
      sortable: true,
      align: 'left',
    },
    {
      key: 'newProspects',
      header: 'Prospectos',
      sortable: true,
      align: 'right',
      render: (item) => <span className="text-right">{item.newProspects}</span>,
    },
    {
      key: 'firstMeetings',
      header: '1ra Reunión',
      sortable: true,
      align: 'right',
      render: (item) => <span className="text-right">{item.firstMeetings}</span>,
    },
    {
      key: 'secondMeetings',
      header: '2da Reunión',
      sortable: true,
      align: 'right',
      render: (item) => <span className="text-right">{item.secondMeetings}</span>,
    },
    {
      key: 'newClients',
      header: 'Clientes',
      sortable: true,
      align: 'right',
      render: (item) => <span className="text-right font-medium">{item.newClients}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Heading size="lg" className="mb-2">
            Historial de Métricas
          </Heading>
          <Text color="secondary">Comparación de métricas por mes y año</Text>
        </div>
        <Button variant="secondary" onClick={() => router.push('/contacts/metrics')}>
          <Icon name="ChevronLeft" size={16} className="mr-2" />
          Volver a Métricas
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              label="Año"
              value={filterYear?.toString() ?? ''}
              onValueChange={(value) => setFilterYear(value ? Number(value) : null)}
              items={[
                { value: '', label: 'Todos los años' },
                ...years.map((year) => ({
                  value: year.toString(),
                  label: year.toString(),
                })),
              ]}
              className="w-48"
            />
            <Select
              label="Mes"
              value={filterMonth?.toString() ?? ''}
              onValueChange={(value) => setFilterMonth(value ? Number(value) : null)}
              items={[
                { value: '', label: 'Todos los meses' },
                ...MONTH_NAMES.map((name, idx) => ({
                  value: (idx + 1).toString(),
                  label: name,
                })),
              ]}
              className="w-48"
            />
            {(filterYear || filterMonth) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterYear(null);
                  setFilterMonth(null);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredRows as unknown as Record<string, unknown>[]}
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            keyField="id"
            loading={loading}
            emptyMessage="No hay datos de historial disponibles"
            virtualized={filteredRows.length > 20}
            virtualizedHeight={600}
          />
        </CardContent>
      </Card>
    </div>
  );
}
