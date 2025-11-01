/**
 * Tipos para el módulo de daily valuation
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

import { type InferSelectModel } from 'drizzle-orm';
import { brokerPositions } from '@cactus/db/schema';
import type { BaseEntity } from './common';

/**
 * BrokerPosition inferido del schema
 */
export type BrokerPosition = InferSelectModel<typeof brokerPositions>;

/**
 * Posición con market value para cálculos de AUM
 * Usa Pick para extraer solo los campos necesarios
 */
export type PositionWithMarketValue = Pick<BrokerPosition, 'marketValue'> & {
  [key: string]: unknown;
};
