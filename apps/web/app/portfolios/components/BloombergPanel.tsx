'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Heading } from '@cactus/ui';
import { LineChart } from 'lucide-react';
import type { Portfolio } from '@/types';

const PortfolioAssetsSnapshot = dynamic(
  () => import('../../components/bloomberg/PortfolioAssetsSnapshot'),
  {
    loading: () => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos de mercado...</div>
    ),
    ssr: false,
  }
);

const PortfolioPerformanceMetrics = dynamic(
  () => import('../../components/bloomberg/PortfolioPerformanceMetrics'),
  {
    loading: () => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Cargando métricas de rendimiento...
      </div>
    ),
    ssr: false,
  }
);

const BloombergMacroWidget = dynamic(
  () => import('../../components/bloomberg/BloombergMacroWidget'),
  {
    loading: () => (
      <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos macro...</div>
    ),
    ssr: false,
  }
);

interface BloombergIntegratedPanelProps {
  portfolios: Portfolio[];
  selectedPortfolioId?: string | null;
}

export function BloombergIntegratedPanel({
  portfolios,
  selectedPortfolioId,
}: BloombergIntegratedPanelProps) {
  // Filtrar portfolios si hay uno seleccionado
  const displayedPortfolios = selectedPortfolioId
    ? portfolios.filter((p) => p.id === selectedPortfolioId)
    : portfolios;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LineChart className="w-5 h-5 text-accent-text" />
        <Heading level={3}>Bloomberg Terminal</Heading>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          <Tabs defaultValue="market" className="w-full">
            <TabsList className="border-b w-full">
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="macro">Macro & Rates</TabsTrigger>
            </TabsList>
            <TabsContent value="market" className="p-6">
              <PortfolioAssetsSnapshot portfolios={displayedPortfolios} />
            </TabsContent>
            <TabsContent value="performance" className="p-6">
              <PortfolioPerformanceMetrics portfolios={displayedPortfolios} />
            </TabsContent>
            <TabsContent value="macro" className="p-6">
              <BloombergMacroWidget />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
