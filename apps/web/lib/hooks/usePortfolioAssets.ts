/**
 * Hook para extraer símbolos únicos de instrumentos de las carteras
 *
 * AI_DECISION: Hook personalizado para lógica de extracción de activos
 * Justificación: Reutilizable y testeable, separa lógica de presentación
 * Impacto: Código más limpio y mantenible
 */

import { useMemo } from 'react';
import type { Portfolio, PortfolioLine } from '@/types';

export interface PortfolioAsset {
  symbol: string;
  name?: string;
  instrumentId: string | null;
  portfolios: string[]; // IDs de portfolios que contienen este activo
  totalWeight: number; // Suma de pesos en todas las carteras
}

/**
 * Extrae todos los símbolos únicos de instrumentos de las carteras
 */
export function usePortfolioAssets(portfolios: Portfolio[]): PortfolioAsset[] {
  return useMemo(() => {
    const assetMap = new Map<string, PortfolioAsset>();

    portfolios.forEach((portfolio) => {
      if (!portfolio.lines || portfolio.lines.length === 0) {
        return;
      }

      portfolio.lines.forEach((line: PortfolioLine) => {
        // Solo procesar líneas de tipo instrument (no assetClass)
        if (line.targetType === 'instrument' && line.instrumentSymbol) {
          const symbol = line.instrumentSymbol.toUpperCase();

          if (assetMap.has(symbol)) {
            const asset = assetMap.get(symbol)!;
            asset.portfolios.push(portfolio.id);
            asset.totalWeight += line.targetWeight;
          } else {
            const asset: PortfolioAsset = {
              symbol,
              instrumentId: line.instrumentId,
              portfolios: [portfolio.id],
              totalWeight: line.targetWeight,
            };
            if (line.instrumentName) {
              asset.name = line.instrumentName;
            }
            assetMap.set(symbol, asset);
          }
        }
      });
    });

    // Convertir a array y ordenar por símbolo
    return Array.from(assetMap.values()).sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [portfolios]);
}
