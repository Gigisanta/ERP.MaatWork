'use client';

/**
 * PortfolioPerformanceMetrics - Métricas tipo Bloomberg para cada cartera
 * 
 * AI_DECISION: Componente cliente para mostrar métricas de rendimiento
 * Justificación: Necesita fetch de datos y renderizado condicional
 * Impacto: Visualización profesional de métricas de rendimiento tipo Bloomberg
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, DataTable, Text, Stack, Spinner, Alert, Badge, Select } from '@cactus/ui';
import { getPortfolioPerformance } from '@/lib/api/analytics';
import type { Portfolio, PortfolioPerformance, TimePeriod } from '@/types';
import type { Column } from '@cactus/ui';

interface PortfolioPerformanceMetricsProps {
  portfolios: Portfolio[];
  period?: TimePeriod;
  className?: string;
}

interface PerformanceRow {
  portfolioId: string;
  portfolioName: string;
  totalReturn: number | null;
  volatility: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  annualizedReturn: number | null;
  loading: boolean;
  error: string | null;
}

export default function PortfolioPerformanceMetrics({ 
  portfolios, 
  period = '1Y',
  className 
}: PortfolioPerformanceMetricsProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceRow[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(period);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      if (portfolios.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Inicializar datos con loading state
      const initialData: PerformanceRow[] = portfolios.map(p => ({
        portfolioId: p.id,
        portfolioName: p.name,
        totalReturn: null,
        volatility: null,
        sharpeRatio: null,
        maxDrawdown: null,
        annualizedReturn: null,
        loading: true,
        error: null
      }));

      setPerformanceData(initialData);

      // Fetch performance para cada portfolio en paralelo
      const promises = portfolios.map(async (portfolio) => {
        try {
          const response = await getPortfolioPerformance(portfolio.id, selectedPeriod);
          
          if (response.success && response.data?.metrics) {
            const metrics = response.data.metrics;
            return {
              portfolioId: portfolio.id,
              portfolioName: portfolio.name,
              totalReturn: (metrics.totalReturn !== undefined && !isNaN(metrics.totalReturn)) ? metrics.totalReturn : null,
              volatility: (metrics.volatility !== undefined && !isNaN(metrics.volatility)) ? metrics.volatility : null,
              sharpeRatio: (metrics.sharpeRatio !== undefined && !isNaN(metrics.sharpeRatio)) ? metrics.sharpeRatio : null,
              maxDrawdown: (metrics.maxDrawdown !== undefined && !isNaN(metrics.maxDrawdown)) ? metrics.maxDrawdown : null,
              annualizedReturn: (metrics.annualizedReturn !== undefined && !isNaN(metrics.annualizedReturn)) ? metrics.annualizedReturn : null,
              loading: false,
              error: null
            };
          } else {
            return {
              portfolioId: portfolio.id,
              portfolioName: portfolio.name,
              totalReturn: null,
              volatility: null,
              sharpeRatio: null,
              maxDrawdown: null,
              annualizedReturn: null,
              loading: false,
              error: response.error || 'No data available'
            };
          }
        } catch (err) {
          return {
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            totalReturn: null,
            volatility: null,
            sharpeRatio: null,
            maxDrawdown: null,
            annualizedReturn: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      });

      const results = await Promise.all(promises);
      setPerformanceData(results);
      setLoading(false);
    };

    fetchPerformance();
  }, [portfolios, selectedPeriod]);

  const formatMetric = (value: number | null, format: 'percent' | 'number' | 'ratio' = 'number'): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }

    switch (format) {
      case 'percent':
        return `${(value * 100).toFixed(2)}%`;
      case 'ratio':
        return value.toFixed(2);
      default:
        return value.toFixed(2);
    }
  };

  const getSharpeColor = (sharpe: number | null): string => {
    if (sharpe === null || isNaN(sharpe)) return '';
    if (sharpe >= 1) return 'text-success-500';
    if (sharpe >= 0.5) return 'text-warning-500';
    return 'text-error-500';
  };

  const columns: Column<PerformanceRow>[] = [
    {
      key: 'portfolioName',
      header: 'Cartera',
      render: (row) => (
        <Text weight="medium">{row.portfolioName}</Text>
      )
    },
    {
      key: 'totalReturn',
      header: 'Total Return',
      render: (row) => {
        if (row.loading) return <Spinner size="sm" />;
        if (row.error) return <Text size="sm" color="secondary">N/A</Text>;
        const value = row.totalReturn;
        const color = value !== null && value >= 0 ? 'text-success-500' : 'text-error-500';
        return <Text size="sm" className={color}>{formatMetric(value, 'percent')}</Text>;
      }
    },
    {
      key: 'annualizedReturn',
      header: 'Retorno Anualizado',
      render: (row) => {
        if (row.loading) return <Spinner size="sm" />;
        if (row.error) return <Text size="sm" color="secondary">N/A</Text>;
        const value = row.annualizedReturn;
        const color = value !== null && value >= 0 ? 'text-success-500' : 'text-error-500';
        return <Text size="sm" className={color}>{formatMetric(value, 'percent')}</Text>;
      }
    },
    {
      key: 'volatility',
      header: 'Volatilidad',
      render: (row) => {
        if (row.loading) return <Spinner size="sm" />;
        if (row.error) return <Text size="sm" color="secondary">N/A</Text>;
        return <Text size="sm">{formatMetric(row.volatility, 'percent')}</Text>;
      }
    },
    {
      key: 'sharpeRatio',
      header: 'Sharpe Ratio',
      render: (row) => {
        if (row.loading) return <Spinner size="sm" />;
        if (row.error) return <Text size="sm" color="secondary">N/A</Text>;
        const value = row.sharpeRatio;
        const color = getSharpeColor(value);
        return <Text size="sm" className={color}>{formatMetric(value, 'ratio')}</Text>;
      }
    },
    {
      key: 'maxDrawdown',
      header: 'Max Drawdown',
      render: (row) => {
        if (row.loading) return <Spinner size="sm" />;
        if (row.error) return <Text size="sm" color="secondary">N/A</Text>;
        const value = row.maxDrawdown;
        const color = value !== null && value < -0.2 ? 'text-error-500' : 'text-foreground-base';
        return <Text size="sm" className={color}>{formatMetric(value, 'percent')}</Text>;
      }
    }
  ];

  if (portfolios.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Text color="secondary">No hay carteras disponibles</Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <Stack direction="row" gap="md" align="center" justify="between">
          <CardTitle>Portfolio Performance Metrics</CardTitle>
          <Select
            value={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}
            items={[
              { value: '1M', label: '1 Mes' },
              { value: '3M', label: '3 Meses' },
              { value: '6M', label: '6 Meses' },
              { value: '1Y', label: '1 Año' },
              { value: 'YTD', label: 'YTD' },
              { value: 'ALL', label: 'Todo' }
            ]}
          />
        </Stack>
      </CardHeader>
      <CardContent>
        {loading && performanceData.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={performanceData}
            keyField="portfolioId"
            emptyMessage="No hay datos de rendimiento disponibles"
          />
        )}
      </CardContent>
    </Card>
  );
}

