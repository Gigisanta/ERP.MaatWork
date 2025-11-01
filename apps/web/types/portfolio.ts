/**
 * Tipos relacionados con portfolios/carteras
 */

import type { RiskLevel } from './common';

export interface Portfolio {
  id: string;
  name: string;
  description?: string | null;
  riskLevel: RiskLevel;
  clientCount?: number;
  createdAt: string;
  updatedAt: string;
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
  instrumentId: string | null; // Puede ser null si aún no está resuelto
  targetWeight: number; // Decimal (0.25 = 25%)
  instrumentSymbol: string; // Required para UI
  instrumentName?: string;
  assetClassName?: string;
}

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  riskLevel: RiskLevel;
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  riskLevel?: RiskLevel;
}

export interface AddPortfolioLineRequest {
  targetType: 'instrument' | 'assetClass';
  instrumentId?: string;
  assetClass?: string;
  targetWeight: number; // Decimal
}

export interface PortfolioWithLines extends Portfolio {
  lines: PortfolioLine[];
  totalWeight: number;
  isValid: boolean;
}

/**
 * Tipos para composición de portfolio (UI)
 */
export interface PortfolioComponent {
  instrumentId?: string;
  instrumentSymbol: string;
  instrumentName?: string;
  targetWeight: number; // Percentage (25 = 25%)
}

export interface PortfolioFormData {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  components: PortfolioComponent[];
}

