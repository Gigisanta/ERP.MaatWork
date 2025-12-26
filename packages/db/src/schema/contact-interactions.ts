import { pgTable, uuid, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { contacts, pipelineStages } from './contacts';

/**
 * contact_stage_interactions
 * Counts interactions (+/-) per contact per stage.
 * Used for metrics and visual indicators in Kanban.
 */
export const contactStageInteractions = pgTable(
  'contact_stage_interactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    pipelineStageId: uuid('pipeline_stage_id').notNull().references(() => pipelineStages.id, { onDelete: 'cascade' }),
    interactionCount: integer('interaction_count').notNull().default(0),
    lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contactStageUnique: uniqueIndex('contact_stage_interactions_unique').on(table.contactId, table.pipelineStageId),
    contactInteractionsIdx: index('idx_contact_stage_interactions_contact').on(table.contactId),
    stageInteractionsIdx: index('idx_contact_stage_interactions_stage').on(table.pipelineStageId),
  })
);











