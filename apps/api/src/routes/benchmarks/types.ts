/**
 * Types para Benchmarks
 *
 * AI_DECISION: Extraer tipos a archivo separado
 * Justificación: Mejora la organización y permite reutilización de tipos
 * Impacto: Código más modular y mantenible
 */

export interface BenchmarkListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  componentCount: number;
}

export interface BenchmarkComponent {
  id: string;
  instrumentId: string | null;
  weight: string;
  createdAt: Date;
  instrumentName: string | null;
  instrumentSymbol: string | null;
  instrumentCurrency: string | null;
  instrumentAssetClass: string | null;
}

export interface BenchmarkComponentBatch {
  benchmarkId: string;
  componentId: string;
  instrumentId: string;
  weight: string;
  instrumentSymbol: string;
  instrumentName: string;
  active: boolean;
}

export interface ComponentWithWeight {
  weight: string;
}



























