/**
 * Tipos relacionados con pipeline
 */

import type { Contact } from './contact';

/**
 * Etapa de pipeline
 */
export interface PipelineStage {
  id: string;
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

