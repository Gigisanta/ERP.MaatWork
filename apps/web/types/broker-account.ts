/**
 * Tipos relacionados con cuentas de broker
 */

import type { BaseEntity } from './common';

/**
 * Cuenta de broker - extiende BaseEntity (solo createdAt)
 */
export interface BrokerAccount extends BaseEntity {
  contactId: string;
  broker: string;
  accountNumber: string;
  accountType?: string | null;
  currency?: string | null;
  createdAt: string;
}

/**
 * Request para crear cuenta de broker - usando Pick para campos requeridos
 */
export interface CreateBrokerAccountRequest extends Pick<BrokerAccount, 'contactId' | 'broker' | 'accountNumber'> {
  accountType?: string | null;
  currency?: string | null;
}
