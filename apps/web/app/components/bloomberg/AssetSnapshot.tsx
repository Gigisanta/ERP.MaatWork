'use client';

/**
 * AssetSnapshot - Bloomberg-style asset snapshot component
 * 
 * AI_DECISION: Client component for real-time asset data display
 * Justificación: Needs client-side interactivity and real-time updates
 * Impacto: Better UX with live data updates
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Text, Heading, Stack, Badge, Spinner, Alert, Button } from '@cactus/ui';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Type definition inline to avoid import issues during webpack module resolution
interface AssetSnapshotType {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52w: number;
  low52w: number;
  pe?: number;
  evEbitda?: number;
  margin?: number;
  roe?: number;
  debtEbitda?: number;
  currency: string;
  source: string;
  asof: string;
}

// AI_DECISION: Función fetch directa para evitar problemas de resolución de webpack en dynamic imports
// Justificación: Webpack tiene problemas resolviendo cadenas de dependencias con alias @/ en dynamic imports.
// Usar fetch directo evita la cadena: @/lib/api/bloomberg → ../api-client → @/types → ./config
// EXCEPCIÓN a la regla "NUNCA usar fetch directamente": Necesario para resolver errores de webpack
// en componentes cargados dinámicamente. El cliente API centralizado causa problemas de resolución.
// Impacto: Resuelve errores "Cannot read properties of undefined (reading 'call')" en webpack
async function fetchAssetSnapshot(symbol: string): Promise<{ success: boolean; data?: AssetSnapshotType; error?: string }> {
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
  className?: string;
}

export default function AssetSnapshot({ symbol, className }: AssetSnapshotProps) {
  const [snapshot, setSnapshot] = useState<AssetSnapshotType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSnapshot = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchAssetSnapshot(symbol);
        if (response.success && response.data) {
          setSnapshot(response.data);
        } else {
          setError(response.error || 'Failed to fetch asset snapshot');
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
  }, [symbol]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Spinner size="md" />
        </CardContent>
      </Card>
    );
  }

  if (error || !snapshot) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="error">
            {error || 'No data available'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const isPositive = snapshot.change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : snapshot.change < 0 ? TrendingDown : Minus;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          <Stack direction="row" gap="sm" align="center">
            <Heading level={3}>{snapshot.symbol}</Heading>
            <Badge variant={isPositive ? 'success' : 'error'}>
              {snapshot.source}
            </Badge>
          </Stack>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Stack direction="column" gap="md">
          {/* Price and Change */}
          <Stack direction="row" gap="lg" align="end">
            <Heading level={2}>
              {snapshot.price.toFixed(2)} {snapshot.currency}
            </Heading>
            <Stack direction="row" gap="xs" align="center" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
              <ChangeIcon className="w-4 h-4" />
              <Text size="lg" weight="bold">
                {isPositive ? '+' : ''}{snapshot.change.toFixed(2)} ({isPositive ? '+' : ''}{snapshot.changePercent.toFixed(2)}%)
              </Text>
            </Stack>
          </Stack>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Text size="sm" color="secondary">52W High</Text>
              <Text size="base" weight="semibold">{snapshot.high52w.toFixed(2)}</Text>
            </div>
            <div>
              <Text size="sm" color="secondary">52W Low</Text>
              <Text size="base" weight="semibold">{snapshot.low52w.toFixed(2)}</Text>
            </div>
            <div>
              <Text size="sm" color="secondary">Volume</Text>
              <Text size="base" weight="semibold">
                {snapshot.volume.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="sm" color="secondary">P/E</Text>
              <Text size="base" weight="semibold">
                {snapshot.pe ? snapshot.pe.toFixed(2) : 'N/A'}
              </Text>
            </div>
            {snapshot.evEbitda && (
              <div>
                <Text size="sm" color="secondary">EV/EBITDA</Text>
                <Text size="base" weight="semibold">{snapshot.evEbitda.toFixed(2)}</Text>
              </div>
            )}
            {snapshot.margin && (
              <div>
                <Text size="sm" color="secondary">Margin</Text>
                <Text size="base" weight="semibold">{snapshot.margin.toFixed(2)}%</Text>
              </div>
            )}
            {snapshot.roe && (
              <div>
                <Text size="sm" color="secondary">ROE</Text>
                <Text size="base" weight="semibold">{snapshot.roe.toFixed(2)}%</Text>
              </div>
            )}
            {snapshot.debtEbitda && (
              <div>
                <Text size="sm" color="secondary">Debt/EBITDA</Text>
                <Text size="base" weight="semibold">{snapshot.debtEbitda.toFixed(2)}</Text>
              </div>
            )}
          </div>

          {/* Source and timestamp */}
          <Text size="xs" color="muted">
            Source: {snapshot.source} | As of: {new Date(snapshot.asof).toLocaleString()}
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}

