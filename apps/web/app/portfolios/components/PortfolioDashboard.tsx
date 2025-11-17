'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, Stack, Select, Text, Button } from '@cactus/ui';
import { BarChart3, LineChart } from 'lucide-react';
import { PortfolioSelector } from './PortfolioSelector';
import { BenchmarkSearcher } from './BenchmarkSearcher';
import { getInstruments, createInstrument } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { Portfolio, Benchmark, TimePeriod } from '@/types';

const PerformanceChart = dynamic(() => import('../../components/PerformanceChart'), {
  loading: () => <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando gráfico...</div>,
  ssr: false,
});

// AI_DECISION: Importar PortfolioAssetsSnapshot estáticamente para evitar problemas de resolución de webpack
// Justificación: Los dynamic imports con @cactus/ui causan errores "Cannot read properties of undefined (reading 'call')"
// porque webpack no puede resolver correctamente @cactus/ui dentro de chunks dinámicos.
// PortfolioAssetsSnapshot no es lo suficientemente pesado como para justificar un dynamic import.
// Impacto: Resuelve errores de webpack, mejor compatibilidad con resolución de módulos workspace
import PortfolioAssetsSnapshot from '../../components/bloomberg/PortfolioAssetsSnapshot';

const PortfolioPerformanceMetrics = dynamic(() => import('../../components/bloomberg/PortfolioPerformanceMetrics'), {
  loading: () => <div style={{ padding: '1rem', textAlign: 'center' }}>Cargando...</div>,
  ssr: false,
});

interface PortfolioDashboardProps {
  portfolios: Portfolio[];
  benchmarks: Benchmark[];
  selectedPortfolioId: string | null;
  onPortfolioSelect: (portfolioId: string | null) => void;
  onBenchmarkSymbolSelect?: (symbol: string) => void;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'YTD', label: 'YTD' },
  { value: 'ALL', label: 'Todo' },
];

export function PortfolioDashboard({
  portfolios,
  benchmarks,
  selectedPortfolioId,
  onPortfolioSelect,
  onBenchmarkSymbolSelect,
}: PortfolioDashboardProps) {
  const [selectedBenchmarkSymbol, setSelectedBenchmarkSymbol] = useState<string | null>(null);
  const [benchmarkInstrumentId, setBenchmarkInstrumentId] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('1Y');
  const [bloombergTab, setBloombergTab] = useState<'market' | 'performance'>('market');
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);

  const portfolioIds = selectedPortfolioId ? [selectedPortfolioId] : [];
  const benchmarkIds = benchmarkInstrumentId ? [benchmarkInstrumentId] : [];
  const displayedPortfolios = selectedPortfolioId
    ? portfolios.filter((p) => p.id === selectedPortfolioId)
    : portfolios;

  const handleBenchmarkSelect = useCallback(
    async (symbol: string) => {
      if (!symbol) {
        setSelectedBenchmarkSymbol(null);
        setBenchmarkInstrumentId(null);
        if (onBenchmarkSymbolSelect) {
          onBenchmarkSymbolSelect('');
        }
        return;
      }

      setSelectedBenchmarkSymbol(symbol);
      setIsLoadingBenchmark(true);

      try {
        // Buscar instrumento existente por símbolo
        const searchResponse = await getInstruments({ search: symbol, limit: 1 });
        
        if (searchResponse.success && searchResponse.data?.instruments && searchResponse.data.instruments.length > 0) {
          const instrument = searchResponse.data.instruments.find((inst) => inst.symbol === symbol);
          if (instrument) {
            setBenchmarkInstrumentId(instrument.id);
            if (onBenchmarkSymbolSelect) {
              onBenchmarkSymbolSelect(symbol);
            }
            setIsLoadingBenchmark(false);
            return;
          }
        }

        // Si no existe, crear el instrumento
        const createResponse = await createInstrument({
          symbol: symbol,
          name: symbol,
          type: 'EQUITY' as const,
          currency: 'USD' as const,
        });

        if (createResponse.success && createResponse.data?.instrument?.id) {
          setBenchmarkInstrumentId(createResponse.data.instrument.id);
          if (onBenchmarkSymbolSelect) {
            onBenchmarkSymbolSelect(symbol);
          }
        } else {
          logger.error('Failed to create instrument for benchmark', toLogContext({ symbol, createResponse }));
        }
      } catch (err) {
        logger.error('Error handling benchmark selection', toLogContext({ err, symbol }));
      } finally {
        setIsLoadingBenchmark(false);
      }
    },
    [onBenchmarkSymbolSelect]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Gráfico de Precios - Ocupa 8 columnas */}
      <div className="lg:col-span-8">
        <Card className="border border-border h-full">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent-text" />
                  <Text weight="semibold" size="sm">Precios de Activos</Text>
                </div>
                <Stack direction="row" gap="xs" align="center" className="flex-wrap">
                  <div className="min-w-[160px]">
                    <PortfolioSelector
                      portfolios={portfolios}
                      selectedPortfolioId={selectedPortfolioId}
                      onSelect={onPortfolioSelect}
                      placeholder="Cartera"
                    />
                  </div>
                  {selectedPortfolioId && (
                    <div className="min-w-[200px] relative">
                      <BenchmarkSearcher
                        onBenchmarkSelect={handleBenchmarkSelect}
                        selectedSymbol={selectedBenchmarkSymbol}
                        placeholder="Buscar índice..."
                      />
                      {isLoadingBenchmark && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="min-w-[100px]">
                    <Select
                      value={period}
                      onValueChange={(value) => setPeriod(value as TimePeriod)}
                      items={PERIOD_OPTIONS}
                    />
                  </div>
                </Stack>
              </div>

              <div style={{ minHeight: '300px' }}>
                {!selectedPortfolioId ? (
                  <div className="flex items-center justify-center h-full py-8">
                    <Stack direction="column" gap="xs" align="center">
                      <BarChart3 className="w-10 h-10 text-foreground-tertiary" />
                      <Text size="sm" color="secondary">Selecciona una cartera</Text>
                    </Stack>
                  </div>
                ) : (
                  <PerformanceChart
                    portfolioIds={portfolioIds}
                    benchmarkIds={benchmarkIds}
                    period={period}
                    height={300}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloomberg Terminal - Ocupa 4 columnas */}
      <div className="lg:col-span-4">
        <Card className="border border-border h-full">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-accent-text" />
                  <Text weight="semibold" size="sm">Bloomberg</Text>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={bloombergTab === 'market' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setBloombergTab('market')}
                    className="h-7 text-xs px-2"
                  >
                    Market
                  </Button>
                  <Button
                    variant={bloombergTab === 'performance' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setBloombergTab('performance')}
                    className="h-7 text-xs px-2"
                  >
                    Perf
                  </Button>
                </div>
              </div>

              <div style={{ minHeight: '300px' }}>
                {displayedPortfolios.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-8">
                    <Text size="sm" color="secondary">No hay carteras disponibles</Text>
                  </div>
                ) : bloombergTab === 'market' ? (
                  <PortfolioAssetsSnapshot portfolios={displayedPortfolios} />
                ) : (
                  <PortfolioPerformanceMetrics portfolios={displayedPortfolios} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

