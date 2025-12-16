'use client';

/**
 * AssetSnapshot - Bloomberg-style asset snapshot component
 *
 * AI_DECISION: Client component for real-time asset data display
 * Justificación: Needs client-side interactivity and real-time updates
 * Impacto: Better UX with live data updates
 */

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Text,
  Heading,
  Stack,
  Badge,
  Spinner,
  Alert,
} from '@cactus/ui';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { type AssetSnapshot as AssetSnapshotType } from '@/lib/api/bloomberg';

// AI_DECISION: Función fetch directa para evitar problemas de resolución de webpack en dynamic imports
// Justificación: Webpack tiene problemas resolviendo cadenas de dependencias con alias @/ en dynamic imports.
// Usar fetch directo evita la cadena: @/lib/api/bloomberg → ../api-client → @/types → ./config
// EXCEPCIÓN a la regla "NUNCA usar fetch directamente": Necesario para resolver errores de webpack
// en componentes cargados dinámicamente. El cliente API centralizado causa problemas de resolución.
// Impacto: Resuelve errores "Cannot read properties of undefined (reading 'call')" en webpack
async function fetchAssetSnapshot(
  symbol: string
): Promise<{ success: boolean; data?: AssetSnapshotType; error?: string }> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/v1/bloomberg/assets/${symbol}/snapshot`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as AssetSnapshotType,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

interface AssetSnapshotProps {
  symbol: string;
  data?: AssetSnapshotType;
  className?: string;
  disableFetch?: boolean;
}

export default function AssetSnapshot({
  symbol,
  data,
  className,
  disableFetch,
}: AssetSnapshotProps) {
  const [snapshot, setSnapshot] = useState<AssetSnapshotType | null>(data || null);
  const [loading, setLoading] = useState(!data && !disableFetch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If data is provided via props, use it and don't fetch
    if (data) {
      setSnapshot(data);
      setLoading(false);
      setError(null);
      return;
    }

    // If fetch is disabled, just wait (or stay loading if appropriate, but usually we wait for data)
    if (disableFetch) {
      // We keep whatever state we have. If we had no data, we are 'loading' waiting for parent.
      // But if we want to avoid showing spinner when we know parent is fetching,
      // we can't really do that without more props.
      // However, the main goal is to STOP the fetch.
      return;
    }

    const fetchSnapshot = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchAssetSnapshot(symbol);
        if (response.success && response.data) {
          setSnapshot(response.data);
        } else {
          // AI_DECISION: Handle missing data gracefully without blocking UI
          // Justificación: 404 is common for new assets, shouldn't look like a system error
          // Impacto: Cleaner UI, less alarming for users
          setError(response.error || 'No data available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();

    // Refresh every 60 seconds
    const interval = setInterval(fetchSnapshot, 60000);
    return () => clearInterval(interval);
  }, [symbol, data, disableFetch]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Spinner size="md" />
        </CardContent>
      </Card>
    );
  }

  // AI_DECISION: Handle missing data gracefully
  // Justificación: Avoid red error boxes for expected missing data
  // Impacto: Better UX
  if (error || !snapshot) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center">
          <Stack direction="column" gap="sm" align="center">
            <Text weight="medium" color="secondary">
              {symbol}
            </Text>
            <Text size="sm" color="muted">
              Data not available
            </Text>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Helper to safely format numbers
  const formatVal = (val: number | null | undefined, decimals = 2, fallback = '--') => {
    if (typeof val !== 'number') return fallback;
    return val.toFixed(decimals);
  };

  const isPositive = (snapshot.change || 0) >= 0;
  const ChangeIcon =
    snapshot.change === null || snapshot.change === undefined
      ? Minus
      : isPositive
        ? TrendingUp
        : TrendingDown;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          <Stack direction="row" gap="sm" align="center">
            <Heading level={3}>{snapshot.symbol}</Heading>
            <Badge variant={isPositive ? 'success' : 'error'}>{snapshot.source}</Badge>
          </Stack>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {/* Price and Change */}
          <Stack direction="row" gap="lg" align="end">
            <Heading level={2}>
              {formatVal(snapshot.price)} {snapshot.currency}
            </Heading>
            <Stack
              direction="row"
              gap="xs"
              align="center"
              style={{ color: (snapshot.change || 0) >= 0 ? '#10b981' : '#ef4444' }}
            >
              <ChangeIcon className="w-4 h-4" />
              <Text size="lg" weight="bold">
                {(snapshot.change || 0) >= 0 ? '+' : ''}
                {formatVal(snapshot.change)} ({(snapshot.change || 0) >= 0 ? '+' : ''}
                {formatVal(snapshot.changePercent)}%)
              </Text>
            </Stack>
          </Stack>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Text size="sm" color="secondary">
                52W High
              </Text>
              <Text size="base" weight="semibold">
                {formatVal(snapshot.high52w)}
              </Text>
            </div>
            <div>
              <Text size="sm" color="secondary">
                52W Low
              </Text>
              <Text size="base" weight="semibold">
                {formatVal(snapshot.low52w)}
              </Text>
            </div>
            <div>
              <Text size="sm" color="secondary">
                Volume
              </Text>
              <Text size="base" weight="semibold">
                {typeof snapshot.volume === 'number' ? snapshot.volume.toLocaleString() : '--'}
              </Text>
            </div>
            <div>
              <Text size="sm" color="secondary">
                P/E
              </Text>
              <Text size="base" weight="semibold">
                {typeof snapshot.pe === 'number' ? snapshot.pe.toFixed(2) : 'N/A'}
              </Text>
            </div>
            {typeof snapshot.evEbitda === 'number' && (
              <div>
                <Text size="sm" color="secondary">
                  EV/EBITDA
                </Text>
                <Text size="base" weight="semibold">
                  {snapshot.evEbitda.toFixed(2)}
                </Text>
              </div>
            )}
            {typeof snapshot.margin === 'number' && (
              <div>
                <Text size="sm" color="secondary">
                  Margin
                </Text>
                <Text size="base" weight="semibold">
                  {snapshot.margin.toFixed(2)}%
                </Text>
              </div>
            )}
            {typeof snapshot.roe === 'number' && (
              <div>
                <Text size="sm" color="secondary">
                  ROE
                </Text>
                <Text size="base" weight="semibold">
                  {snapshot.roe.toFixed(2)}%
                </Text>
              </div>
            )}
            {typeof snapshot.debtEbitda === 'number' && (
              <div>
                <Text size="sm" color="secondary">
                  Debt/EBITDA
                </Text>
                <Text size="base" weight="semibold">
                  {snapshot.debtEbitda.toFixed(2)}
                </Text>
              </div>
            )}
          </div>

          {/* Source and timestamp */}
          <Text size="xs" color="muted">
            Source: {snapshot.source} | As of:{' '}
            {snapshot.asof ? new Date(snapshot.asof).toLocaleString() : 'N/A'}
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}
