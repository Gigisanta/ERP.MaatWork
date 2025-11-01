/**
 * Tipos para el módulo de contactos
 * Centralizados para evitar duplicidad según patrones de arquitectura
 */

import { type InferSelectModel } from 'drizzle-orm';
import { contacts, tags, contactTags, tasks } from '@cactus/db/schema';

/**
 * Contacto base inferido del schema
 */
export type Contact = InferSelectModel<typeof contacts>;

/**
 * Tag inferido del schema
 */
export type Tag = InferSelectModel<typeof tags>;

/**
 * Tag simplificado para contacto (sin contactId)
 */
export type ContactTag = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

/**
 * ContactTag con información del tag
 * Resultado de query join entre contactTags y tags
 */
export type ContactTagWithInfo = {
  contactId: string | null;
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

/**
 * Contacto con tags agregadas
 */
export type ContactWithTags = Contact & {
  tags: ContactTag[];
};

/**
 * Task inferido del schema para timeline
 */
export type Task = InferSelectModel<typeof tasks>;

/**
 * Item de timeline unificado
 */
export type TimelineItem = Task & {
  type: 'task';
  timestamp: Date;
};

/**
 * Objeto de actualización parcial de contacto
 */
export type ContactUpdateFields = {
  version?: number;
  updatedAt?: Date;
  [key: string]: unknown;
};

