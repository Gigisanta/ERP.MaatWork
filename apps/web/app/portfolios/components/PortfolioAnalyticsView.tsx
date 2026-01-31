'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, Grid, Stack, Select, Text, Heading, Button } from '@maatwork/ui';
import { BarChart3, ArrowRightLeft } from 'lucide-react';
import { AssetWatchlist } from './AssetWatchlist';
import { PortfolioSelector } from './PortfolioSelector';
import { BenchmarkSearcher } from './BenchmarkSearcher';
import type { Portfolio, PortfolioLine, TimePeriod } from '@/types';
import { getInstruments, createInstrument } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import PerformanceChart from '../../components/PerformanceChart';

// AI_DECISION: Switch to static import for PerformanceChart
// Justificación: Dynamic import caused Webpack "undefined (reading 'call')" error in development.
//                PerformanceChart is lightweight enough (SVG) to be included in the main bundle.
// Impacto: Fixes development crash, slightly increases initial bundle size but ensures stability.

interface PortfolioAnalyticsViewProps {
  portfolios: Portfolio[];
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'YTD', label: 'YTD' },
  { value: 'ALL', label: 'Todo' },
];

export function PortfolioAnalyticsView({ portfolios }: PortfolioAnalyticsViewProps) {
  // State for the selected primary asset (from Watchlist)
  const [selectedAsset, setSelectedAsset] = useState<{
    line: PortfolioLine;
    portfolioId: string;
  } | null>(null);

  // State for comparison
  const [comparisonMode, setComparisonMode] = useState<'none' | 'portfolio' | 'asset'>('none');
  const [comparisonId, setComparisonId] = useState<string | null>(null);

  // State for chart period
  const [period, setPeriod] = useState<TimePeriod>('1Y');

  // Helper derived state
  const selectedAssetKey = selectedAsset
    ? `${selectedAsset.portfolioId}-${selectedAsset.line.instrumentId}`
    : null;

  const handleAssetSelect = useCallback((line: PortfolioLine, portfolioId: string) => {
    setSelectedAsset({ line, portfolioId });
  }, []);

  const handleComparisonPortfolioSelect = useCallback((portfolioId: string | null) => {
    setComparisonId(portfolioId);
    if (portfolioId) setComparisonMode('portfolio');
    else setComparisonMode('none');
  }, []);

  const handleBenchmarkSelect = useCallback(async (symbol: string) => {
    if (!symbol) {
      setComparisonId(null);
      setComparisonMode('none');
      return;
    }

    try {
      // Logic to ensure instrument exists, similar to original dashboard
      const searchResponse = await getInstruments({ search: symbol, limit: 1 });
      let instrumentId: string | null = null;

      if (searchResponse.success && searchResponse.data?.instruments?.length) {
        const instrument = searchResponse.data.instruments.find((i) => i.symbol === symbol);
        if (instrument) instrumentId = instrument.id;
      }

      if (!instrumentId) {
        const createResponse = await createInstrument({
          symbol,
          name: symbol,
          type: 'EQUITY',
          currency: 'USD',
        });
        if (createResponse.success && createResponse.data?.instrument) {
          instrumentId = createResponse.data.instrument.id;
        }
      }

      if (instrumentId) {
        setComparisonId(instrumentId);
        setComparisonMode('asset');
      }
    } catch (err) {
      logger.error(toLogContext({ err, symbol }), 'Error selecting comparison benchmark');
    }
  }, []);

  // Prepare IDs for the chart
  const chartPortfolioIds: string[] = [];
  const chartBenchmarkIds: string[] = [];

  // Add primary asset
  if (selectedAsset?.line.instrumentId) {
    chartBenchmarkIds.push(selectedAsset.line.instrumentId);
  }

  // Add comparison target
  if (comparisonMode === 'portfolio' && comparisonId) {
    chartPortfolioIds.push(comparisonId);
  } else if (comparisonMode === 'asset' && comparisonId) {
    chartBenchmarkIds.push(comparisonId);
  }

  return (
    <div className="min-h-screen bg-background pb-8 overflow-x-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
          {/* Main Chart Area - 8 Columns */}
          <div className="lg:col-span-8 flex flex-col h-full gap-4">
            <Card className="flex-1 border border-border flex flex-col overflow-hidden">
              <CardContent className="p-6 h-full flex flex-col">
                {/* Header / Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <Stack direction="row" gap="sm" align="center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <Heading level={3} className="text-lg font-semibold">
                      Precios de Activos
                    </Heading>
                  </Stack>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Comparison Selector */}
                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50">
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground ml-2" />
                      <div className="w-[200px]">
                        {comparisonMode === 'asset' ? (
                          <BenchmarkSearcher
                            selectedSymbol={
                              comparisonMode === 'asset' &&
                              comparisonId &&
                              typeof comparisonId === 'string' &&
                              comparisonId.length < 10
                                ? comparisonId
                                : ''
                            } // Simplified
                            onBenchmarkSelect={handleBenchmarkSelect}
                            placeholder="Comparar con activo..."
                          />
                        ) : (
                          <PortfolioSelector
                            portfolios={portfolios}
                            selectedPortfolioId={
                              comparisonMode === 'portfolio' ? comparisonId : null
                            }
                            onSelect={handleComparisonPortfolioSelect}
                            placeholder="Comparar con cartera..."
                          />
                        )}
                      </div>

                      {/* Toggle Comparison Mode Button (Simple implementation) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-xs"
                        onClick={() => {
                          setComparisonMode((prev) =>
                            prev === 'portfolio' ? 'asset' : 'portfolio'
                          );
                          setComparisonId(null);
                        }}
                      >
                        {comparisonMode === 'portfolio' ? 'Activos' : 'Carteras'}
                      </Button>
                    </div>

                    {/* Period Selector */}
                    <div className="w-[100px]">
                      <Select
                        value={period}
                        onValueChange={(value: string) => setPeriod(value as TimePeriod)}
                        items={PERIOD_OPTIONS}
                      />
                    </div>
                  </div>
                </div>

                {/* Chart Content */}
                <div className="flex-1 w-full min-h-0 relative">
                  {!selectedAsset ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Stack
                        direction="column"
                        gap="md"
                        align="center"
                        className="text-muted-foreground"
                      >
                        <BarChart3 className="w-12 h-12 opacity-20" />
                        <Text align="center" size="lg" weight="medium">
                          Selecciona un activo de la lista
                        </Text>
                        <Text align="center" size="sm" className="max-w-xs opacity-70">
                          Haz clic en cualquier activo del panel derecho para visualizar su
                          historial de precios
                        </Text>
                      </Stack>
                    </div>
                  ) : (
                    <PerformanceChart
                      portfolioIds={chartPortfolioIds}
                      benchmarkIds={chartBenchmarkIds}
                      period={period}
                      height={500} // Approximate height, responsive handled by container
                      className="h-full w-full border-0 shadow-none"
                    />
                  )}
                </div>

                {selectedAsset && (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      Mostrando:{' '}
                      <span className="font-medium text-foreground">
                        {selectedAsset.line.instrumentSymbol}
                      </span>
                      {comparisonId && (
                        <>
                          {' '}
                          vs{' '}
                          <span className="font-medium text-foreground">
                            {comparisonMode === 'portfolio'
                              ? portfolios.find((p) => p.id === comparisonId)?.name
                              : 'Comparación'}
                          </span>
                        </>
                      )}
                    </div>
                    <div>{selectedAsset.line.instrumentName}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Watchlist - 4 Columns */}
          <div className="lg:col-span-4 h-full overflow-hidden">
            <AssetWatchlist
              portfolios={portfolios}
              selectedAssetKey={selectedAssetKey}
              onSelect={handleAssetSelect}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
