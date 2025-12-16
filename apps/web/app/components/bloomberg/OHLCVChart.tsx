'use client';

/**
 * OHLCVChart - Multi-timeframe OHLCV chart with technical indicators
 *
 * AI_DECISION: Client component for interactive charts
 * Justificación: Charts need client-side rendering and interactivity
 * Impacto: Rich data visualization with technical analysis
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
} from '@cactus/ui';
import { getOHLCV } from '@/lib/api/bloomberg';
import type { OHLCVPoint } from '@/lib/api/bloomberg';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface OHLCVChartProps {
  symbol: string;
  className?: string;
  height?: number;
}

type Timeframe = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '1d', label: '1 Day' },
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All' },
];

export default function OHLCVChart({ symbol, className, height = 400 }: OHLCVChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [data, setData] = useState<OHLCVPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMA, setShowMA] = useState(true);
  const [maPeriod, setMaPeriod] = useState(20);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range based on timeframe
        const to = new Date();
        const from = new Date();

        switch (timeframe) {
          case '1d':
            from.setDate(from.getDate() - 1);
            break;
          case '1w':
            from.setDate(from.getDate() - 7);
            break;
          case '1m':
            from.setMonth(from.getMonth() - 1);
            break;
          case '3m':
            from.setMonth(from.getMonth() - 3);
            break;
          case '6m':
            from.setMonth(from.getMonth() - 6);
            break;
          case '1y':
            from.setFullYear(from.getFullYear() - 1);
            break;
          case 'all':
            // Don't set from date
            break;
        }

        const response = await getOHLCV(
          symbol,
          '1d',
          timeframe !== 'all' ? from.toISOString().split('T')[0] : undefined,
          to.toISOString().split('T')[0]
        );

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || 'Failed to fetch OHLCV data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeframe]);

  // Calculate moving average
  const calculateMA = (period: number): number[] => {
    if (data.length < period) return [];

    const ma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, point) => acc + point.close, 0);
        ma.push(sum / period);
      }
    }
    return ma;
  };

  const maData = showMA && Array.isArray(data) ? calculateMA(maPeriod) : [];
  const chartData = Array.isArray(data)
    ? data.map((point, index) => ({
        date: new Date(point.date).toLocaleDateString(),
        close: point.close,
        volume: point.volume,
        ma: maData[index] || null,
      }))
    : [];

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Spinner size="md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Text color="secondary">No data available for {symbol}</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <Stack direction="row" gap="md" align="center" justify="between">
          <CardTitle>{symbol} - Price Chart</CardTitle>
          <Stack direction="row" gap="sm" align="center">
            <Select
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as Timeframe)}
              items={TIMEFRAME_OPTIONS}
            />
          </Stack>
        </Stack>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="close"
              stroke="var(--color-chart-1)"
              fill="var(--color-chart-1)"
              fillOpacity={0.2}
              name="Close Price"
            />
            {showMA && maData.some((v) => !isNaN(v)) && (
              <Line
                type="monotone"
                dataKey="ma"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={false}
                name={`MA(${maPeriod})`}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
