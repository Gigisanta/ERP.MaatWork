/**
 * Tipos para el módulo de daily valuation
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

import { type InferSelectModel } from 'drizzle-orm';
import { brokerPositions } from '@cactus/db/schema';

/**
 * BrokerPosition inferido del schema
 */
export type BrokerPosition = InferSelectModel<typeof brokerPositions>;

/**
 * Posición con market value para cálculos de AUM
 */
export type PositionWithMarketValue = {
  marketValue: string | null;
  [key: string]: unknown;
};

