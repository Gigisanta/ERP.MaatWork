/**
 * User Feedback system
 * Allows users to submit feedback/feature requests for the application.
 */

import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Enum for feedback type
 */
export const feedbackTypeEnum = pgEnum('feedback_type', ['feedback', 'feature_request', 'bug']);

/**
 * Enum for feedback status (for admin tracking)
 */
export const feedbackStatusEnum = pgEnum('feedback_status', [
  'new',
  'in_progress',
  'completed',
  'closed',
]);

/**
 * feedback
 * User feedback and feature requests table.
 */
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: feedbackTypeEnum('type').notNull().default('feedback'),
    content: text('content').notNull(),
    status: feedbackStatusEnum('status').notNull().default('new'),
    adminNotes: text('admin_notes'), // Internal notes for admins
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    feedbackUserIdIdx: index('idx_feedback_user_id').on(table.userId),
    feedbackStatusIdx: index('idx_feedback_status').on(table.status),
    feedbackCreatedAtIdx: index('idx_feedback_created_at').on(table.createdAt),
  })
);
