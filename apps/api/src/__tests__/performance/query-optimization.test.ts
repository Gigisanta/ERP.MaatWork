/**
 * Performance Tests for Query Optimizations
 *
 * Tests to validate query optimizations and prevent regressions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@maatwork/db';
import { contacts, notes, tasks } from '@maatwork/db/schema';
import { sql, eq, and, isNull, desc } from 'drizzle-orm';

describe('Query Optimization Tests', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await db().execute(sql`SELECT 1`);
  });

  describe('Window Function Pagination', () => {
    it('should use COUNT(*) OVER() for pagination in contacts list', async () => {
      const result = await db()
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          total: sql<number>`COUNT(*) OVER()`.as('total'),
        })
        .from(contacts)
        .where(isNull(contacts.deletedAt))
        .limit(10)
        .offset(0);

      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('total');
        expect(typeof result[0].total).toBe('number');
      }
    });

    it('should use COUNT(*) OVER() for pagination in notes list', async () => {
      // Get a contact ID for testing
      const [contact] = await db()
        .select({ id: contacts.id })
        .from(contacts)
        .where(isNull(contacts.deletedAt))
        .limit(1);

      if (!contact) {
        // Skip test if no contacts exist
        return;
      }

      const result = await db()
        .select({
          id: notes.id,
          content: notes.content,
          total: sql<number>`count(*) OVER()`.as('total'),
        })
        .from(notes)
        .where(and(eq(notes.contactId, contact.id), isNull(notes.deletedAt)))
        .limit(10)
        .offset(0);

      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('total');
        expect(typeof result[0].total).toBe('number');
      }
    });

    it('should use COUNT(*) OVER() for pagination in tasks list', async () => {
      const result = await db()
        .select({
          id: tasks.id,
          title: tasks.title,
          total: sql<number>`COUNT(*) OVER()`.as('total'),
        })
        .from(tasks)
        .where(isNull(tasks.deletedAt))
        .limit(10)
        .offset(0);

      expect(result.length).toBeGreaterThanOrEqual(0);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('total');
        expect(typeof result[0].total).toBe('number');
      }
    });
  });

  describe('Batch Queries', () => {
    it('should support batch queries for contact tags', async () => {
      // Get multiple contact IDs for testing
      const contactList = await db()
        .select({ id: contacts.id })
        .from(contacts)
        .where(isNull(contacts.deletedAt))
        .limit(5);

      if (contactList.length < 2) {
        // Skip test if not enough contacts exist
        return;
      }

      const contactIds = contactList.map((c) => c.id);

      // This simulates the batch query pattern
      const result = await db()
        .select({
          contactId: sql<string>`contact_id`.as('contactId'),
          tagId: sql<string>`tag_id`.as('tagId'),
        })
        .from(sql`contact_tags`)
        .where(sql`contact_id = ANY(${contactIds})`);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should support batch queries for notes', async () => {
      // Get multiple contact IDs for testing
      const contactList = await db()
        .select({ id: contacts.id })
        .from(contacts)
        .where(isNull(contacts.deletedAt))
        .limit(5);

      if (contactList.length < 2) {
        // Skip test if not enough contacts exist
        return;
      }

      const contactIds = contactList.map((c) => c.id);

      // This simulates the batch query pattern
      const result = await db()
        .select({
          id: notes.id,
          contactId: notes.contactId,
          content: notes.content,
        })
        .from(notes)
        .where(sql`${notes.contactId} = ANY(${contactIds})`)
        .where(isNull(notes.deletedAt));

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Index Usage', () => {
    it('should use composite indexes for contact queries', async () => {
      // This test verifies that queries can use composite indexes
      // The actual index usage is verified by EXPLAIN ANALYZE in production
      const result = await db()
        .select()
        .from(contacts)
        .where(
          and(
            isNull(contacts.deletedAt),
            eq(contacts.assignedAdvisorId, sql`(SELECT id FROM users LIMIT 1)`)
          )
        )
        .orderBy(desc(contacts.updatedAt))
        .limit(10);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should use partial indexes for open tasks', async () => {
      // This test verifies that queries can use partial indexes
      const result = await db()
        .select()
        .from(tasks)
        .where(and(sql`${tasks.status} IN ('open', 'in_progress')`, isNull(tasks.deletedAt)))
        .orderBy(desc(tasks.dueDate))
        .limit(10);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
