'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Alert,
  Spinner,
  Select,
  Grid,
  Badge,
} from '@cactus/ui';

interface PerformanceChartProps {
  portfolioIds?: string[];
  benchmarkIds?: string[];
  period?: string;
  height?: number;
  className?: string;
}

interface PerformancePoint {
  date: string;
  value: number;
}

interface PerformanceData {
  id: string;
  name: string;
  type: 'portfolio' | 'benchmark';
  performance: PerformancePoint[];
  totalReturn: number;
  color: string;
}

const PERIOD_OPTIONS = [
  { value: '1M', label: '1 Mes' },
  { value: '3M', label: '3 Meses' },
  { value: '6M', label: '6 Meses' },
  { value: '1Y', label: '1 Año' },
  { value: 'YTD', label: 'Año Actual' },
  { value: 'ALL', label: 'Todo' }
];

const COLORS = [
  'var(--color-chart-1)', // Blue
  'var(--color-chart-2)', // Green
  'var(--color-chart-3)', // Amber
  'var(--color-chart-4)', // Red
  'var(--color-chart-5)', // Purple
  'var(--color-chart-6)', // Cyan
];

export default function PerformanceChart({
  portfolioIds = [],
  benchmarkIds = [],
  period = '1Y',
  height = 400,
  className = ""
}: PerformanceChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (portfolioIds.length === 0 && benchmarkIds.length === 0) {
        setPerformanceData([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const token = localStorage.getItem('token'); // Obtener token de localStorage

        if (!token) {
          setError('Debes iniciar sesión para ver el rendimiento');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${apiUrl}/v1/analytics/compare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            portfolioIds,
            benchmarkIds,
            period: selectedPeriod
          })
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.data && result.data.results) {
          // Mapear datos de la API al formato del componente
          const data: PerformanceData[] = result.data.results.map((item: any, index: number) => ({
            id: item.id,
            name: item.name,
            type: item.type as 'portfolio' | 'benchmark',
            performance: item.performance.map((p: any) => ({
              date: p.date,
              value: p.value // Ya viene normalizado a base 100
            })),
            totalReturn: item.metrics?.totalReturn || 0,
            color: COLORS[index % COLORS.length]
          }));
          
          setPerformanceData(data);
        } else {
          setError('No se pudieron obtener los datos de rendimiento');
          setPerformanceData([]);
        }
      } catch (err) {
        setError('Error al cargar datos de rendimiento');
        console.error('Error fetching performance data:', err);
        setPerformanceData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceData();
  }, [portfolioIds, benchmarkIds, selectedPeriod]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatValue = (value: number) => {
    return value.toFixed(2);
  };

  const formatReturn = (returnValue: number) => {
    const sign = returnValue >= 0 ? '+' : '';
    return `${sign}${returnValue.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <Stack direction="column" gap="md" align="center">
              <Spinner size="lg" />
              <Text color="secondary">Cargando datos de rendimiento...</Text>
            </Stack>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <Alert variant="error" title="Error">
              {error}
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (performanceData.length === 0) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <Stack direction="column" gap="md" align="center">
              <BarChart3 className="w-12 h-12 text-foreground-tertiary" />
              <Text color="secondary">Selecciona carteras o benchmarks para comparar</Text>
            </Stack>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular rangos para el gráfico
  const allValues = performanceData.flatMap(d => d.performance.map(p => p.value));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10% padding

  const scaleY = (value: number) => {
    return ((maxValue + padding - value) / (range + 2 * padding)) * (height - 100) + 50;
  };

  const scaleX = (index: number, total: number) => {
    return (index / (total - 1)) * (800 - 100) + 50; // Width: 800px, padding: 50px
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Stack direction="row" gap="sm" align="center">
            <BarChart3 className="w-5 h-5 text-accent-text" />
            <CardTitle>Rendimiento Comparativo</CardTitle>
          </Stack>
          
          <Stack direction="row" gap="sm" align="center">
            <Calendar className="w-4 h-4 text-foreground-tertiary" />
            <Select
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              items={PERIOD_OPTIONS}
              className="w-32"
            />
          </Stack>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative" style={{ width: '100%', height: `${height}px` }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full w-12 flex flex-col justify-between text-xs text-gray-500">
            <span>{formatValue(maxValue + padding)}</span>
            <span>{formatValue((maxValue + minValue) / 2)}</span>
            <span>{formatValue(minValue - padding)}</span>
          </div>

          {/* Chart area */}
          <svg width="100%" height="100%" className="absolute left-12 top-0">
            {/* Grid lines */}
            {[0, 0.5, 1].map((ratio, i) => (
              <line
                key={i}
                x1="0"
                y1={scaleY(maxValue + padding - range * ratio)}
                x2="800"
                y2={scaleY(maxValue + padding - range * ratio)}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}

            {/* Performance lines */}
            {performanceData.map((data, dataIndex) => (
              <g key={data.id}>
                {/* Line path */}
                <path
                  d={data.performance.map((point, index) => {
                    const x = scaleX(index, data.performance.length);
                    const y = scaleY(point.value);
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={data.color}
                  strokeWidth="2"
                  className="drop-shadow-sm"
                />
                
                {/* Data points */}
                {data.performance.map((point, index) => {
                  const x = scaleX(index, data.performance.length);
                  const y = scaleY(point.value);
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={data.color}
                      className="hover:r-4 transition-all cursor-pointer"
                    />
                  );
                })}
              </g>
            ))}

            {/* Base line at 100 */}
            <line
              x1="0"
              y1={scaleY(100)}
              x2="800"
              y2={scaleY(100)}
              stroke="#6B7280"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          {performanceData.map((data) => (
            <Stack key={data.id} direction="row" gap="sm" align="center">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: data.color }}
              />
              <Text weight="medium">{data.name}</Text>
              <Badge variant={data.totalReturn >= 0 ? 'success' : 'error'}>
                <Stack direction="row" gap="xs" align="center">
                  {data.totalReturn >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <Text size="sm">{formatReturn(data.totalReturn)}</Text>
                </Stack>
              </Badge>
            </Stack>
          ))}
        </div>

        {/* Summary Stats */}
        <Grid cols={3} gap="md" className="mt-6">
          <Card>
            <CardContent>
              <Stack direction="column" gap="sm">
                <Text size="sm" weight="medium" color="secondary">Mejor Rendimiento</Text>
                <Stack direction="column" gap="xs">
                  <Text size="lg" weight="semibold" color="primary">
                    {performanceData.length > 0 ? (
                      performanceData.reduce((best, current) => 
                        current.totalReturn > best.totalReturn ? current : best
                      ).name
                    ) : (
                      'N/A'
                    )}
                  </Text>
                  <Text size="sm" color="secondary">
                    {performanceData.length > 0 ? formatReturn(Math.max(...performanceData.map(d => d.totalReturn))) : ''}
                  </Text>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack direction="column" gap="sm">
                <Text size="sm" weight="medium" color="secondary">Peor Rendimiento</Text>
                <Stack direction="column" gap="xs">
                  <Text size="lg" weight="semibold" color="secondary">
                    {performanceData.length > 0 ? (
                      performanceData.reduce((worst, current) => 
                        current.totalReturn < worst.totalReturn ? current : worst
                      ).name
                    ) : (
                      'N/A'
                    )}
                  </Text>
                  <Text size="sm" color="secondary">
                    {performanceData.length > 0 ? formatReturn(Math.min(...performanceData.map(d => d.totalReturn))) : ''}
                  </Text>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack direction="column" gap="sm">
                <Text size="sm" weight="medium" color="secondary">Rendimiento Promedio</Text>
                <Stack direction="column" gap="xs">
                  <Text size="lg" weight="semibold">
                    {performanceData.length > 0 ? (
                      formatReturn(
                        performanceData.reduce((sum, d) => sum + d.totalReturn, 0) / performanceData.length
                      )
                    ) : (
                      'N/A'
                    )}
                  </Text>
                  <Text size="sm" color="secondary">
                    {performanceData.length > 0 ? `${performanceData.length} elementos` : ''}
                  </Text>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </CardContent>
    </Card>
  );
}