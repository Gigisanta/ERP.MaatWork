/**
 * Tipos relacionados con cuentas de broker
 */

import type { BaseEntity, CreateRequest } from './common';

/**
 * Cuenta de broker - extiende BaseEntity (solo createdAt)
 */
export interface BrokerAccount extends BaseEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  contactId: string;
  broker: string;
  accountNumber: string;
  accountType?: string | null;
  currency?: string | null;
  createdAt: string;
}

/**
 * Request para crear cuenta de broker - usando utility type CreateRequest
 */
export interface CreateBrokerAccountRequest extends Omit<CreateRequest<BrokerAccount>, 'createdAt'> {
  contactId: string;
  broker: string;
  accountNumber: string;
  accountType?: string | null;
  currency?: string | null;
}
