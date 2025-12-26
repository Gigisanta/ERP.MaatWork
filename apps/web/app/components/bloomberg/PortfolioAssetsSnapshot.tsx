'use client';

/**
 * PortfolioAssetsSnapshot - Grid de snapshots tipo Bloomberg para activos únicos en las carteras
 *
 * AI_DECISION: Componente cliente para mostrar snapshots de activos en carteras
 * Justificación: Necesita interactividad y navegación, muestra datos en tiempo real
 * Impacto: Mejor UX para ver datos de mercado de activos en carteras
 */

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Grid,
  Button,
  Text,
  Stack,
  Spinner,
  Alert,
} from '@maatwork/ui';
import { ExternalLink } from 'lucide-react';
import { usePortfolioAssets } from '@/lib/hooks/usePortfolioAssets';
import { useAssetSnapshots } from '@/lib/hooks/useAssetSnapshots';
import type { Portfolio } from '@/types';
// AI_DECISION: Importar AssetSnapshot estáticamente en lugar de dinámicamente
// Justificación: Los dynamic imports anidados causan problemas de resolución de webpack con @maatwork/ui.
// Cuando PortfolioAssetsSnapshot ya se carga dinámicamente, no necesitamos cargar AssetSnapshot también
// dinámicamente. Esto evita la cadena problemática de resolución de módulos.
// Impacto: Resuelve errores "Cannot read properties of undefined (reading 'call')" en webpack
import AssetSnapshot from './AssetSnapshot';

interface PortfolioAssetsSnapshotProps {
  portfolios: Portfolio[];
  maxAssets?: number; // Límite de activos a mostrar
  className?: string;
}

export default function PortfolioAssetsSnapshot({
  portfolios,
  maxAssets = 12,
  className,
}: PortfolioAssetsSnapshotProps) {
  const router = useRouter();
  const assets = usePortfolioAssets(portfolios);

  // Limitar número de activos si se especifica
  const displayedAssets = useMemo(() => {
    return assets.slice(0, maxAssets);
  }, [assets, maxAssets]);

  // AI_DECISION: Batch fetch asset snapshots
  // Justificación: Reduce N+1 queries by fetching all asset data in a single request
  // Impacto: Significant performance improvement (1 request vs N requests)
  const symbols = useMemo(() => displayedAssets.map((a) => a.symbol), [displayedAssets]);
  const { snapshots, isLoading } = useAssetSnapshots(symbols);

  const snapshotsMap = useMemo(() => {
    const map = new Map();
    snapshots.forEach((s) => map.set(s.symbol, s));
    return map;
  }, [snapshots]);

  if (portfolios.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Text color="secondary">No hay carteras disponibles</Text>
        </CardContent>
      </Card>
    );
  }

  if (assets.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="info">
            <Text>
              No hay activos en las carteras. Agrega instrumentos a tus carteras para ver sus datos
              de mercado.
            </Text>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <Stack direction="row" gap="md" align="center" justify="between">
            <CardTitle>Portfolio Assets Snapshot</CardTitle>
            <Stack direction="row" gap="sm" align="center">
              {isLoading && <Spinner size="sm" />}
              <Text size="sm" color="secondary">
                {assets.length} activo{assets.length !== 1 ? 's' : ''} único
                {assets.length !== 1 ? 's' : ''}
                {assets.length > maxAssets && ` (mostrando ${maxAssets})`}
              </Text>
            </Stack>
          </Stack>
        </CardHeader>
        <CardContent>
          <Grid cols={1} gap="md" className="md:grid-cols-2 lg:grid-cols-3">
            {displayedAssets.map((asset) => (
              <div key={asset.symbol} className="relative">
                <AssetSnapshot
                  symbol={asset.symbol}
                  data={snapshotsMap.get(asset.symbol)}
                  disableFetch={true}
                />
                <div className="mt-2 flex items-center justify-between">
                  <Text size="xs" color="secondary">
                    En {asset.portfolios.length} cartera{asset.portfolios.length !== 1 ? 's' : ''}
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/assets/${asset.symbol}`)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ver Detalle
                  </Button>
                </div>
              </div>
            ))}
          </Grid>

          {assets.length > maxAssets && (
            <div className="mt-4 text-center">
              <Text size="sm" color="secondary">
                Mostrando {maxAssets} de {assets.length} activos. Agrega más activos a tus carteras
                para ver más snapshots.
              </Text>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
