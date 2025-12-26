'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Spinner, Text, Alert } from '@maatwork/ui';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { getTeamHistory, type TeamHistoryMetric } from '@/lib/api/teams';

interface TeamHistoryChartProps {
  teamId: string;
}

export default function TeamHistoryChart({ teamId }: TeamHistoryChartProps) {
  const [history, setHistory] = useState<TeamHistoryMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [teamId]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeamHistory(teamId);
      if (res.success && res.data) {
        setHistory(res.data);
      } else {
        setError('Error al cargar historial del equipo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-[300px]">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-[300px]">
          <Text color="secondary">No hay datos históricos disponibles.</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Rendimiento (12 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={history}
              margin={{
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
              }}
            >
              <CartesianGrid stroke="#f5f5f5" vertical={false} />
              <XAxis
                dataKey="month"
                scale="band"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  // Format YYYY-MM to MMM-YY if possible, or just use as is
                  const [year, month] = value.split('-');
                  if (year && month) {
                    const date = new Date(parseInt(year), parseInt(month) - 1);
                    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                  }
                  return value;
                }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'totalAum') return [formatCurrency(value), 'AUM Total'];
                  if (name === 'newClients') return [value, 'Nuevos Clientes'];
                  return [value, name];
                }}
                labelFormatter={(label) => {
                  const [year, month] = label.split('-');
                  if (year && month) {
                    const date = new Date(parseInt(year), parseInt(month) - 1);
                    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                  }
                  return label;
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalAum"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="AUM Total"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="newClients"
                stroke="var(--secondary)"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Nuevos Clientes"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
