/**
 * Tipos relacionados con instrumentos financieros
 */

import type { BaseEntity, TimestampedEntity } from './common';
import type { AssetType, Currency } from './common';

/**
 * Instrumento base - extiende TimestampedEntity
 */
export interface Instrument extends TimestampedEntity {
  symbol: string;
  name: string;
  type: AssetType;
  currency: Currency;
  exchange?: string | null;
  sector?: string | null;
  country?: string | null;
  isActive: boolean;
}

/**
 * Resultado de búsqueda de instrumento (simplificado)
 */
export interface InstrumentSearchResult extends Pick<Instrument, 'id' | 'symbol' | 'name' | 'type' | 'currency'> {}

/**
 * Validación de instrumento
 */
export interface InstrumentValidation {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Request para crear instrumento - usando Pick para campos requeridos
 */
export interface CreateInstrumentRequest extends Pick<Instrument, 'symbol' | 'name' | 'type' | 'currency'> {
  exchange?: string | null;
  sector?: string | null;
  country?: string | null;
  isActive?: boolean;
}

/**
 * Response de creación de instrumento
 */
export interface CreateInstrumentResponse {
  instrument: Instrument;
  validation: InstrumentValidation;
}

/**
 * Snapshot de precio
 */
export interface PriceSnapshot extends BaseEntity {
  instrumentId: string;
  symbol: string;
  closePrice: string | null;
  currency: string;
  asOfDate: string;
  createdAt: string;
}
