/**
 * Broker Account Types - Shared broker account-related types
 */

import type { BaseEntity, CreateRequest } from './common';

/**
 * Broker account
 */
export interface BrokerAccount extends BaseEntity {
  contactId: string;
  broker: string;
  accountNumber: string;
  accountType?: string | null;
  currency?: string | null;
  createdAt: string | Date;
}

/**
 * Request to create a broker account
 */
export interface CreateBrokerAccountRequest extends Omit<CreateRequest<BrokerAccount>, 'createdAt'> {
  contactId: string;
  broker: string;
  accountNumber: string;
  accountType?: string | null;
  currency?: string | null;
}






