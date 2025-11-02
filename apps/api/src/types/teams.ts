/**
 * Tipos para el módulo de teams
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

import type { BaseEntity } from './common';

/**
 * Pending invite con userId - extiende BaseEntity
 */
export interface PendingInvite extends Pick<BaseEntity, 'id'> {
  userId: string;
}
