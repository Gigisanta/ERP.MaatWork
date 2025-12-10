'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, Stack, Select, Text, Heading } from '@cactus/ui';
import { BarChart3 } from 'lucide-react';
import { PortfolioSelector } from './PortfolioSelector';
import type { Portfolio, Benchmark, TimePeriod } from '@/types';

const PerformanceChart = dynamic(() => import('../../components/PerformanceChart'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando gráfico...</div>,
  ssr: false,
});

interface PortfolioPriceChartProps {
  portfolios: Portfolio[];
  benchmarks: Benchmark[];
  selectedPortfolioId?: string | null;
  onPortfolioSelect: (portfolioId: string | null) => void;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: '1M', label: '1 Mes' },
  { value: '3M', label: '3 Meses' },
  { value: '6M', label: '6 Meses' },
  { value: '1Y', label: '1 Año' },
  { value: 'YTD', label: 'Año Actual' },
  { value: 'ALL', label: 'Todo' },
];

export function PortfolioPriceChart({
  portfolios,
  benchmarks,
  selectedPortfolioId,
  onPortfolioSelect,
}: PortfolioPriceChartProps) {
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('1Y');

  const portfolioIds = selectedPortfolioId ? [selectedPortfolioId] : [];
  const benchmarkIds = selectedBenchmarkId ? [selectedBenchmarkId] : [];

  const benchmarkItems = [
    { value: '', label: 'Sin benchmark' },
    ...benchmarks.map((benchmark) => ({
      value: benchmark.id,
      label: benchmark.name,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Stack direction="row" gap="sm" align="center">
          <BarChart3 className="w-5 h-5 text-accent-text" />
          <Heading level={3}>Precios de Activos en Cartera</Heading>
        </Stack>

        <Stack direction="row" gap="sm" align="center" className="flex-wrap">
          <div className="min-w-[200px]">
            <PortfolioSelector
              portfolios={portfolios}
              selectedPortfolioId={selectedPortfolioId ?? null}
              onSelect={onPortfolioSelect}
              placeholder="Seleccionar cartera"
            />
          </div>

          {selectedPortfolioId && (
            <div className="min-w-[200px]">
              <Select
                value={selectedBenchmarkId || ''}
                onValueChange={(value) => setSelectedBenchmarkId(value || null)}
                items={benchmarkItems}
              />
            </div>
          )}

          <div className="min-w-[150px]">
            <Select
              value={period}
              onValueChange={(value) => setPeriod(value as TimePeriod)}
              items={PERIOD_OPTIONS}
            />
          </div>
        </Stack>
      </div>

      {!selectedPortfolioId ? (
        <Card className="border border-border">
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <Stack direction="column" gap="sm" align="center">
                <BarChart3 className="w-12 h-12 text-foreground-tertiary" />
                <Text color="secondary">
                  Selecciona una cartera para ver los precios de sus activos
                </Text>
              </Stack>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PerformanceChart
          portfolioIds={portfolioIds}
          benchmarkIds={benchmarkIds}
          period={period}
          height={400}
        />
      )}
    </div>
  );
}
