/**
 * Tipos relacionados con pipeline
 */

import type { BaseEntity } from './common';
import type { Contact } from './contact';

/**
 * Etapa de pipeline - extiende BaseEntity (sin timestamps requeridos)
 */
export interface PipelineStage extends BaseEntity {
  name: string;
  order: number;
  color?: string;
  description?: string;
}

/**
 * Etapa de pipeline con contactos (respuesta del endpoint /board)
 */
export interface PipelineStageWithContacts extends PipelineStage {
  contacts: Contact[];
  currentCount: number;
  wipLimit?: number | null;
}

/**
 * Board de pipeline (contactos agrupados por etapa)
 */
export interface PipelineBoard {
  [stageId: string]: Contact[];
}
