/**
 * Pipeline Types - Shared pipeline-related types
 */

import type { BaseEntity } from './common';
import type { Contact } from './contact';

/**
 * Pipeline stage
 */
export interface PipelineStage extends BaseEntity {
  name: string;
  order: number;
  color?: string | null;
  description?: string | null;
}

/**
 * Pipeline stage with contacts (from /board endpoint)
 */
export interface PipelineStageWithContacts extends PipelineStage {
  contacts: Contact[];
  currentCount: number;
  wipLimit?: number | null;
}

/**
 * Pipeline board (contacts grouped by stage)
 */
export interface PipelineBoard {
  [stageId: string]: Contact[];
}
