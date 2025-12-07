/**
 * Tipos relacionados con portfolios/carteras
 */

import type { TimestampedEntity, UpdateRequest, CreateRequest, ComponentBase, RiskLevel } from './common';

/**
 * Portfolio base - extiende TimestampedEntity
 */
export interface Portfolio extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  name: string;
  description?: string | null;
  riskLevel: RiskLevel;
  clientCount?: number;
  lines?: PortfolioLine[];
}

/**
 * Línea de portfolio - puede referenciar un instrumento o asset class
 */
export interface PortfolioLine {
  id: string;
  templateId: string;
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
  name: string;
  riskLevel: RiskLevel;
  description?: string | null;
}

/**
 * Request para actualizar portfolio - usando utility type UpdateRequest
 */
export interface UpdatePortfolioRequest extends UpdateRequest<Portfolio> {}

/**
 * Request para agregar línea de portfolio
 */
export interface AddPortfolioLineRequest {
  targetType: 'instrument' | 'assetClass';
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
export interface PortfolioComponent extends ComponentBase {
  // targetWeight ya está definido en ComponentBase
  // Percentage (25 = 25%)
}

/**
 * Datos de formulario de portfolio
 */
export interface PortfolioFormData {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  components: PortfolioComponent[];
}
