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
import { getAssetSnapshot } from '@/lib/api/bloomberg';
import type { AssetSnapshot as AssetSnapshotType } from '@/lib/api/bloomberg';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
        const response = await getAssetSnapshot(symbol);
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
          <Stack direction="row" gap="sm" alignItems="center">
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
          <Stack direction="row" gap="lg" alignItems="baseline">
            <Heading level={2}>
              {snapshot.price.toFixed(2)} {snapshot.currency}
            </Heading>
            <Stack direction="row" gap="xs" alignItems="center" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
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
              <Text size="md" weight="semibold">{snapshot.high52w.toFixed(2)}</Text>
            </div>
            <div>
              <Text size="sm" color="secondary">52W Low</Text>
              <Text size="md" weight="semibold">{snapshot.low52w.toFixed(2)}</Text>
            </div>
            <div>
              <Text size="sm" color="secondary">Volume</Text>
              <Text size="md" weight="semibold">
                {snapshot.volume.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="sm" color="secondary">P/E</Text>
              <Text size="md" weight="semibold">
                {snapshot.pe ? snapshot.pe.toFixed(2) : 'N/A'}
              </Text>
            </div>
            {snapshot.evEbitda && (
              <div>
                <Text size="sm" color="secondary">EV/EBITDA</Text>
                <Text size="md" weight="semibold">{snapshot.evEbitda.toFixed(2)}</Text>
              </div>
            )}
            {snapshot.margin && (
              <div>
                <Text size="sm" color="secondary">Margin</Text>
                <Text size="md" weight="semibold">{snapshot.margin.toFixed(2)}%</Text>
              </div>
            )}
            {snapshot.roe && (
              <div>
                <Text size="sm" color="secondary">ROE</Text>
                <Text size="md" weight="semibold">{snapshot.roe.toFixed(2)}%</Text>
              </div>
            )}
            {snapshot.debtEbitda && (
              <div>
                <Text size="sm" color="secondary">Debt/EBITDA</Text>
                <Text size="md" weight="semibold">{snapshot.debtEbitda.toFixed(2)}</Text>
              </div>
            )}
          </div>

          {/* Source and timestamp */}
          <Text size="xs" color="tertiary">
            Source: {snapshot.source} | As of: {new Date(snapshot.asof).toLocaleString()}
          </Text>
        </Stack>
      </CardContent>
    </Card>
  );
}

