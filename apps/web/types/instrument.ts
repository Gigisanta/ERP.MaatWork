/**
 * Tipos relacionados con instrumentos financieros
 */

import type { AssetType, Currency } from './common';

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: string | null;
  currency: Currency;
  exchange: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentSearchResult {
  symbol: string;
  name: string;
  shortName: string;
  currency: Currency;
  exchange: string;
  type: AssetType;
  sector?: string;
  industry?: string;
  marketCap?: number;
  success: boolean;
}

export interface InstrumentValidation {
  valid: boolean;
  symbol: string;
  name?: string;
  currency?: Currency;
  exchange?: string;
  type?: AssetType;
  error?: string;
  success: boolean;
}

export interface CreateInstrumentRequest {
  symbol: string;
  backfill_days?: number;
}

export interface CreateInstrumentResponse {
  instrument: Instrument;
  pricesCount: number;
  message: string;
}

export interface PriceSnapshot {
  id: string;
  instrumentId: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
  createdAt: string;
}

