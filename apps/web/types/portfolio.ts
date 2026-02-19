/**
 * Tipos relacionados con portfolios/carteras
 */

import type {
  TimestampedEntity,
  UpdateRequest,
  CreateRequest,
  ComponentBase,
  RiskLevel,
} from './common';

/**
 * Portfolio base - extiende TimestampedEntity
 */
export interface Portfolio extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  code?: string | null;
  name: string;
  type?: 'template' | 'benchmark' | 'hybrid';
  description?: string | null;
  riskLevel: RiskLevel | null;
  isSystem?: boolean;
  clientCount?: number;
  lineCount?: number;
  lines?: PortfolioLine[];
}

/**
 * Línea de portfolio - puede referenciar un instrumento o asset class
 */
export interface PortfolioLine {
  id: string;
  portfolioId: string;
  targetType: 'instrument' | 'assetClass';
  assetClass?: string | null;
  instrumentId: string | null;
  targetWeight: number; // Decimal (0.25 = 25%)
  instrumentSymbol: string;
  instrumentName?: string;
  assetClassName?: string;
}

/**
 * Request para crear portfolio - usando utility type CreateRequest
 */
export interface CreatePortfolioRequest extends CreateRequest<Portfolio> {
  code?: string;
  name: string;
  type?: 'template' | 'benchmark' | 'hybrid';
  riskLevel: RiskLevel | null;
  description?: string | null;
  isSystem?: boolean;
}

/**
 * Request para actualizar portfolio - usando utility type UpdateRequest
 */
export type UpdatePortfolioRequest = UpdateRequest<Portfolio>;

/**
 * Request para agregar línea de portfolio
 */
export interface AddPortfolioLineRequest {
  targetType?: 'instrument' | 'assetClass'; // Made optional, defaults to instrument in some contexts or backend handles it? 
  // Check backend: backend usually requires it. BUT Benchmark calls hardcoded it.
  // Consolidating types: BenchmarkComponent had 'instrumentId' and 'weight'.
  // PortfolioLine has 'targetType', 'instrumentId', 'targetWeight'.
  instrumentId?: string;
  assetClass?: string;
  targetWeight: number; // Decimal
}

/**
 * Portfolio con líneas completas
 */
export interface PortfolioWithLines extends Portfolio {
  lines: PortfolioLine[];
  totalWeight: number;
  isValid: boolean;
}

/**
 * Tipos para composición de portfolio (UI)
 * Extiende ComponentBase para compartir estructura con BenchmarkComponent
 */
type PortfolioComponent = ComponentBase;

/**
 * Datos de formulario de portfolio
 */
interface PortfolioFormData {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  components: PortfolioComponent[];
}
