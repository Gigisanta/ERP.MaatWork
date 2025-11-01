/**
 * Tipos relacionados con cuentas de broker
 */

/**
 * Cuenta de broker
 */
export interface BrokerAccount {
  id: string;
  contactId: string;
  broker: string;
  accountNumber: string;
  holderName?: string | null;
  status?: 'active' | 'closed';
  lastSyncedAt?: string | null;
  createdAt: string;
}

/**
 * Request para crear cuenta de broker
 */
export interface CreateBrokerAccountRequest {
  contactId: string;
  broker: string;
  accountNumber: string;
  holderName?: string;
}

