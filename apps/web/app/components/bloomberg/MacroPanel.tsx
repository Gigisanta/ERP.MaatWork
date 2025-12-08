'use client';

/**
 * MacroPanel - Panel for displaying macroeconomic data (AR/US)
 *
 * AI_DECISION: Client component for macro data visualization
 * Justificación: Interactive panel with selectors and charts
 * Impacto: Better macro data analysis and visualization
 */

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Spinner,
  Alert,
  Text,
  Stack,
  Heading,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@cactus/ui';
import { getMacroSeries, getMacroSeriesList } from '@/lib/api/bloomberg';
import type { MacroSeriesPoint, MacroSeriesListItem } from '@/lib/api/bloomberg';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MacroPanelProps {
  className?: string;
  height?: number;
}

export default function MacroPanel({ className, height = 300 }: MacroPanelProps) {
  const [country, setCountry] = useState<'US' | 'AR'>('US');
  const [seriesList, setSeriesList] = useState<MacroSeriesListItem[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [data, setData] = useState<MacroSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeriesList = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getMacroSeriesList(country);
        if (response.success && response.data) {
          setSeriesList(response.data);
          if (response.data.length > 0 && !selectedSeries) {
            const firstSeries = response.data[0];
            setSelectedSeries(firstSeries.id || String(firstSeries.id));
          }
        } else {
          setError(response.error || 'Failed to fetch macro series');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSeriesList();
  }, [country]);

  useEffect(() => {
    if (!selectedSeries) return;

    const fetchData = async () => {
      setLoadingData(true);
      setError(null);

      try {
        // Get data for last year
        const to = new Date();
        const from = new Date();
        from.setFullYear(from.getFullYear() - 1);

        const response = await getMacroSeries(
          selectedSeries,
          from.toISOString().split('T')[0],
          to.toISOString().split('T')[0]
        );

        if (response.success && response.data) {
          setData(response.data.points);
        } else {
          setError(response.error || 'Failed to fetch macro series data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [selectedSeries]);

  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString(),
    value: point.value,
  }));

  const selectedSeriesInfo = seriesList.find(
    (s) => (s.series_id || s.seriesId || s.id) === selectedSeries
  );

  return (
    <Card className={className}>
      <CardHeader>
        <Stack direction="row" gap="md" align="center" justify="between">
          <CardTitle>Macro Economic Data</CardTitle>
          <Tabs value={country} onValueChange={(v) => setCountry(v as 'US' | 'AR')}>
            <TabsList>
              <TabsTrigger value="US">US</TabsTrigger>
              <TabsTrigger value="AR">AR</TabsTrigger>
            </TabsList>
          </Tabs>
        </Stack>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner size="md" />
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : (
          <Stack direction="column" gap="md">
            <Select
              value={selectedSeries || ''}
              onValueChange={(value) => setSelectedSeries(value)}
              items={seriesList.map((s) => ({
                value: String(s.series_id || s.seriesId || s.id || ''),
                label: `${s.name} (${s.series_id || s.seriesId || s.id})`,
              }))}
              placeholder="Select a macro series"
            />

            {selectedSeriesInfo && (
              <Stack direction="column" gap="xs">
                <Heading level={4}>{selectedSeriesInfo.name}</Heading>
                <Text size="sm" color="secondary">
                  {String(selectedSeriesInfo.description || 'No description available')}
                </Text>
                <Text size="xs" color="muted">
                  Frequency: {String(selectedSeriesInfo.frequency || 'N/A')} | Units:{' '}
                  {String(selectedSeriesInfo.units || 'N/A')}
                </Text>
              </Stack>
            )}

            {loadingData ? (
              <Spinner size="md" />
            ) : data.length > 0 ? (
              <ResponsiveContainer width="100%" height={height}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{
                      value: selectedSeriesInfo?.units || 'Value',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
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
                    dataKey="value"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                    name={selectedSeriesInfo?.name || 'Value'}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Text color="secondary">No data available</Text>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
