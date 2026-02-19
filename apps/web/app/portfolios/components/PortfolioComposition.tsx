'use client';

import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, Button, Text, Stack, Badge } from '@maatwork/ui';
// AI_DECISION: Import AssetSearcher statically to avoid webpack module resolution issues
// Justificación: Dynamic import causes "Cannot read properties of undefined (reading 'call')" in webpack
// Impacto: Fixes development crash, consistent with BenchmarksSection.tsx
import AssetSearcher from '../../components/AssetSearcher';
import type { PortfolioLine, InstrumentSearchResult } from '@/types';

interface PortfolioCompositionProps {
  lines: PortfolioLine[];
  onAddAsset: (asset: InstrumentSearchResult) => void | { duplicate: boolean; symbol?: string };
  onUpdateWeight: (lineId: string, weight: number) => void;
  onRemoveLine: (lineId: string) => void;
  onDistributeEvenly?: () => void;
  showAssetSearcher?: boolean;
  disabled?: boolean;
}

export function PortfolioComposition({
  lines,
  onAddAsset,
  onUpdateWeight,
  onRemoveLine,
  onDistributeEvenly,
  showAssetSearcher = true,
  disabled = false,
}: PortfolioCompositionProps) {
  const totalWeight = useMemo(() => {
    if (!Array.isArray(lines) || lines.length === 0) {
      return 0;
    }
    return lines.reduce((sum, line) => {
      const weight = typeof line.targetWeight === 'number' ? line.targetWeight * 100 : 0;
      return sum + (isNaN(weight) ? 0 : weight);
    }, 0);
  }, [lines]);

  const isValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <Stack direction="column" gap="md">
      {showAssetSearcher && (
        <div>
          <Text size="sm" weight="medium" className="mb-2 block">
            Buscar Activos
          </Text>
          <AssetSearcher
            onAssetSelect={onAddAsset}
            placeholder="Buscar activo (ej: AAPL, Apple, MERVAL)"
          />
        </div>
      )}

      {lines.length > 0 ? (
        <>
          <Stack direction="column" gap="sm">
            {lines.map((line) => (
              <Card key={line.id} className="border border-border">
                <CardContent className="p-3">
                  <Stack direction="row" gap="sm" align="center">
                    <div className="flex-1 min-w-0">
                      <Text weight="medium" className="truncate">
                        {line.instrumentName || line.assetClassName || 'Sin nombre'}
                      </Text>
                      {line.instrumentSymbol && (
                        <Text size="sm" color="secondary" className="truncate">
                          {line.instrumentSymbol}
                        </Text>
                      )}
                    </div>
                    <Stack direction="row" gap="sm" align="center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={typeof line.targetWeight === 'number' ? line.targetWeight * 100 : 0}
                        onChange={(e) => onUpdateWeight(line.id, Number(e.target.value))}
                        disabled={disabled}
                        aria-label={`Peso para ${line.instrumentName || 'activo'}`}
                        className="w-20 px-2 py-1 text-sm border border-border bg-surface text-foreground-base rounded focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <Text size="sm" color="secondary">
                        %
                      </Text>
                      {!disabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveLine(line.id)}
                          className="text-error-500 hover:text-error-600"
                          aria-label={`Eliminar ${line.instrumentName || 'activo'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Card className="border border-border">
            <CardContent className="p-4">
              <Stack direction="row" justify="between" align="center">
                <Text weight="medium">Total:</Text>
                <Stack direction="row" gap="sm" align="center">
                  {onDistributeEvenly && lines.length > 0 && !disabled && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDistributeEvenly}
                    >
                      Distribuir
                    </Button>
                  )}
                  <Badge variant={isValid ? 'success' : 'error'}>{totalWeight.toFixed(2)}%</Badge>
                </Stack>
              </Stack>
              {!isValid && (
                <Text size="sm" color="secondary" className="mt-2">
                  Los pesos deben sumar exactamente 100%
                </Text>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-8">
          <Text color="secondary">No hay activos en la cartera</Text>
          <Text size="sm" color="muted" className="mt-1">
            Busca activos reales en el campo de búsqueda
          </Text>
        </div>
      )}
    </Stack>
  );
}
