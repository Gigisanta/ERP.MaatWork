/**
 * Tipos relacionados con contactos
 */

/**
 * Contacto base
 */
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  country?: string | null;
  pipelineStageId?: string | null;
  assignedAdvisorId?: string | null;
  assignedTeamId?: string | null;
  source?: string | null;
  riskProfile?: string | null;
  nextStep?: string | null;
  notes?: string | null;
  customFields?: Record<string, ContactFieldValue>;
  contactLastTouchAt?: string | null;
  pipelineStageUpdatedAt?: string | null;
  deletedAt?: string | null;
  version?: number;
  tags?: Array<{ id: string; name: string; color: string; icon?: string }>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tipos de valores permitidos para actualizar campos de contacto
 */
export type ContactFieldValue = string | number | boolean | null | Date;

/**
 * Nombres de campos válidos para actualizar contacto
 */
export type ContactFieldName = 
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'phoneSecondary'
  | 'whatsapp'
  | 'address'
  | 'city'
  | 'country'
  | 'dateOfBirth'
  | 'dni'
  | 'pipelineStageId'
  | 'source'
  | 'riskProfile'
  | 'assignedAdvisorId'
  | 'assignedTeamId'
  | 'nextStep'
  | 'notes';

/**
 * Campo de actualización de contacto
 */
export interface ContactFieldUpdate {
  field: ContactFieldName | string; // string para flexibilidad con customFields
  value: ContactFieldValue;
}

/**
 * Request para crear contacto
 */
export interface CreateContactRequest {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  dni?: string | null;
  pipelineStageId?: string | null;
  source?: string | null;
  riskProfile?: string | null;
  notes?: string | null;
}

/**
 * Request para actualizar contacto
 */
export interface UpdateContactRequest {
  fields?: ContactFieldUpdate[];
  [key: string]: ContactFieldValue | ContactFieldUpdate[] | undefined;
}

