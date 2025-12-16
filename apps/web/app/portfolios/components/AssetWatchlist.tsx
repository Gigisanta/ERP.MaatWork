'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Text, Badge } from '@cactus/ui';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAssetSnapshots } from '@/lib/hooks/useAssetSnapshots';
import type { Portfolio, PortfolioLine } from '@/types';
import { cn } from '@cactus/ui';

interface AssetWatchlistProps {
  portfolios: Portfolio[];
  selectedAssetKey?: string | null; // composite key: `${portfolioId}-${instrumentId}`
  onSelect: (asset: PortfolioLine, portfolioId: string) => void;
  className?: string;
}

export function AssetWatchlist({
  portfolios,
  selectedAssetKey,
  onSelect,
  className,
}: AssetWatchlistProps) {
  // 1. Collect all symbols for batch fetching
  const allSymbols = useMemo(() => {
    const symbols = new Set<string>();
    portfolios.forEach((portfolio) => {
      portfolio.lines?.forEach((line) => {
        if (line.targetType === 'instrument' && line.instrumentSymbol) {
          // Ensure we don't add empty or malformed symbols
          const cleanSymbol = line.instrumentSymbol.trim();
          if (cleanSymbol && !cleanSymbol.includes(' ')) {
            symbols.add(cleanSymbol);
          }
        }
      });
    });
    return Array.from(symbols);
  }, [portfolios]);

  // 2. Fetch snapshots
  const { snapshots, isLoading } = useAssetSnapshots(allSymbols);

  // 3. Create map for easy access
  const snapshotsMap = useMemo(() => {
    const map = new Map();
    snapshots.forEach((s) => map.set(s.symbol, s));
    return map;
  }, [snapshots]);

  // Helper to format price
  const formatPrice = (price?: number) => {
    if (typeof price !== 'number') return '---';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  // Helper to format change
  const formatChange = (change?: number) => {
    if (typeof change !== 'number') return '---';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <Card className={cn('h-full flex flex-col border border-border bg-card', className)}>
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Watchlist</span>
          <Badge variant="secondary" className="text-xs font-normal">
            {allSymbols.length} Activos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar">
          <div className="flex flex-col">
            {portfolios.map((portfolio) => {
              const instrumentLines =
                portfolio.lines?.filter(
                  (l) => l.targetType === 'instrument' && l.instrumentSymbol
                ) || [];

              if (instrumentLines.length === 0) return null;

              return (
                <div key={portfolio.id} className="border-b border-border/50 last:border-0">
                  <div className="bg-muted/40 px-4 py-2 sticky top-0 z-10 backdrop-blur-md border-y border-border/10">
                    <Text
                      size="xs"
                      weight="bold"
                      className="uppercase tracking-wider text-primary/80"
                    >
                      {portfolio.name}
                    </Text>
                  </div>
                  <div>
                    {instrumentLines.map((line) => {
                      const snapshot = snapshotsMap.get(line.instrumentSymbol);
                      const isSelected =
                        selectedAssetKey === `${portfolio.id}-${line.instrumentId}`;
                      const change = snapshot?.changePercent || snapshot?.change; // Fallback
                      const isPositive = (change || 0) > 0;
                      const isNegative = (change || 0) < 0;

                      return (
                        <div
                          key={`${portfolio.id}-${line.instrumentId}`}
                          className={cn(
                            'flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 border-l-2',
                            isSelected
                              ? 'bg-primary/5 border-l-primary'
                              : 'border-l-transparent hover:bg-muted/30 hover:border-l-muted-foreground/30'
                          )}
                          onClick={() => onSelect(line, portfolio.id)}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <Text
                                weight={isSelected ? 'bold' : 'medium'}
                                className={cn(
                                  'truncate',
                                  isSelected ? 'text-primary' : 'text-foreground'
                                )}
                              >
                                {line.instrumentSymbol}
                              </Text>
                            </div>
                            <Text size="xs" color="secondary" className="truncate max-w-[150px]">
                              {line.instrumentName || 'Unknown Asset'}
                            </Text>
                          </div>

                          <div className="flex flex-col items-end gap-0.5">
                            <Text
                              weight="medium"
                              size="sm"
                              className={isSelected ? 'text-foreground' : 'text-foreground/90'}
                            >
                              {formatPrice(snapshot?.price)}
                            </Text>
                            <div
                              className={cn(
                                'flex items-center text-xs font-medium',
                                isPositive && 'text-green-600 dark:text-green-400',
                                isNegative && 'text-red-600 dark:text-red-400',
                                !isPositive && !isNegative && 'text-muted-foreground'
                              )}
                            >
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : isNegative ? (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              ) : (
                                <Minus className="w-3 h-3 mr-1" />
                              )}
                              {formatChange(change)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {portfolios.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground gap-2">
                <Text>No se encontraron carteras.</Text>
                <Text size="sm">Crea una nueva cartera para ver activos aquí.</Text>
              </div>
            )}

            {portfolios.length > 0 && allSymbols.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground gap-2">
                <Text>No hay activos en las carteras.</Text>
                <Text size="sm">Edita tus carteras para agregar instrumentos.</Text>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
