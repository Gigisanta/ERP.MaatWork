'use client';

/**
 * YieldCurveChart - Interactive US Treasury yield curve chart
 *
 * AI_DECISION: Client component for yield curve visualization
 * Justificación: Interactive chart needs client-side rendering
 * Impacto: Better visualization of yield curve dynamics
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
  Badge,
} from '@cactus/ui';
import { getYieldCurve, getYieldSpreads } from '@/lib/api/bloomberg';
import type { YieldCurve } from '@/lib/api/bloomberg';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface YieldCurveChartProps {
  country?: string;
  className?: string;
  height?: number;
}

const TENOR_ORDER = ['1m', '3m', '6m', '1y', '2y', '5y', '7y', '10y', '20y', '30y'];

export default function YieldCurveChart({
  country = 'US',
  className,
  height = 400,
}: YieldCurveChartProps) {
  const [date, setDate] = useState<string | undefined>(undefined);
  const [curve, setCurve] = useState<YieldCurve | null>(null);
  const [spreads, setSpreads] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [curveResponse, spreadsResponse] = await Promise.all([
          getYieldCurve(country, date),
          getYieldSpreads(country, date),
        ]);

        if (curveResponse.success && curveResponse.data) {
          // Handle both curve format and raw data format
          if ('yields' in curveResponse.data) {
            setCurve(curveResponse.data as YieldCurve);
            if (curveResponse.data.spreads) {
              setSpreads(curveResponse.data.spreads);
            }
          } else {
            // If data is array, we need to convert it
            setError('Yield curve data format not supported');
          }
        } else if (spreadsResponse.success && spreadsResponse.data) {
          // If curve failed but spreads succeeded, we can still show spreads
          setSpreads(spreadsResponse.data.spreads);
        }

        if (!curveResponse.success && !spreadsResponse.success) {
          setError(curveResponse.error || spreadsResponse.error || 'Failed to fetch yield curve');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [country, date]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Spinner size="md" />
        </CardContent>
      </Card>
    );
  }

  if (error || !curve) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="error">{error || 'No yield curve data available'}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData =
    curve && curve.yields
      ? TENOR_ORDER.filter((tenor) => curve.yields && curve.yields[tenor]).map((tenor) => ({
          tenor,
          yield: curve.yields![tenor].value,
        }))
      : [];

  // Check for inverted curve (2s10s spread)
  const isInverted = spreads && spreads['2s10s'] && spreads['2s10s'] < 0;

  return (
    <Card className={className}>
      <CardHeader>
        <Stack direction="row" gap="md" align="center" justify="between">
          <CardTitle>
            {country} Treasury Yield Curve
            {isInverted && (
              <Badge variant="error" className="ml-2">
                Inverted (2s10s: {spreads!['2s10s']?.toFixed(2)}%)
              </Badge>
            )}
          </CardTitle>
          {curve.date && (
            <Text size="sm" color="secondary">
              {new Date(curve.date).toLocaleDateString()}
            </Text>
          )}
        </Stack>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tenor" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{ value: 'Yield (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="yield"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-chart-1)', r: 4 }}
              name="Yield"
            />
            {isInverted && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />}
          </LineChart>
        </ResponsiveContainer>

        {spreads && (
          <Stack direction="row" gap="lg" className="mt-4">
            <div>
              <Text size="sm" color="secondary">
                2s10s Spread
              </Text>
              <Text
                size="base"
                weight="semibold"
                style={{ color: spreads['2s10s'] && spreads['2s10s'] < 0 ? '#ef4444' : '#10b981' }}
              >
                {spreads['2s10s']?.toFixed(2)}%
              </Text>
            </div>
            {spreads['3m10y'] && (
              <div>
                <Text size="sm" color="secondary">
                  3m-10y Spread
                </Text>
                <Text size="base" weight="semibold">
                  {spreads['3m10y'].toFixed(2)}%
                </Text>
              </div>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
