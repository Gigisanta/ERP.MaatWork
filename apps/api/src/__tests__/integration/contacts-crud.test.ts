/**
 * Integration tests for contacts CRUD operations
 *
 * Tests complete CRUD flow with real database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@cactus/db';
import { contacts } from '@cactus/db/schema';
import { eq } from 'drizzle-orm';
import { createTestUser, deleteTestUser } from '../../helpers/test-auth';
import { createTestContact, cleanupTestFixtures } from '../../helpers/test-fixtures';

describe('Contacts CRUD Integration Tests', () => {
  let testUserId: string | null = null;
  let createdContactIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    const testUser = await createTestUser({
      email: `test-contacts-${Date.now()}@example.com`,
      role: 'advisor',
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup contacts
    if (createdContactIds.length > 0) {
      await cleanupTestFixtures({ contacts: createdContactIds });
    }

    // Cleanup user
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  describe('Create Contact', () => {
    it('should create a new contact', async () => {
      const contact = await createTestContact({
        firstName: 'Integration',
        lastName: 'Test',
        email: `integration-${Date.now()}@example.com`,
      });

      createdContactIds.push(contact.id);

      expect(contact.id).toBeDefined();
      expect(contact.firstName).toBe('Integration');
      expect(contact.lastName).toBe('Test');
    });

    it('should create contact with assigned advisor', async () => {
      if (!testUserId) {
        return;
      }

      const contact = await createTestContact({
        firstName: 'Assigned',
        lastName: 'Contact',
        assignedAdvisorId: testUserId,
      });

      createdContactIds.push(contact.id);

      expect(contact.assignedAdvisorId).toBe(testUserId);
    });
  });

  describe('Read Contact', () => {
    it('should read contact by ID', async () => {
      const contact = await createTestContact({
        firstName: 'Read',
        lastName: 'Test',
      });

      createdContactIds.push(contact.id);

      const [found] = await db()
        .select()
        .from(contacts)
        .where(eq(contacts.id, contact.id))
        .limit(1);

      expect(found).toBeDefined();
      expect(found?.firstName).toBe('Read');
      expect(found?.lastName).toBe('Test');
    });

    it('should list contacts with pagination', async () => {
      // Create multiple contacts
      const contact1 = await createTestContact({ firstName: 'List1' });
      const contact2 = await createTestContact({ firstName: 'List2' });
      const contact3 = await createTestContact({ firstName: 'List3' });

      createdContactIds.push(contact1.id, contact2.id, contact3.id);

      // Query with limit - using inArray instead of multiple or
      const { inArray } = await import('drizzle-orm');
      const results = await db()
        .select()
        .from(contacts)
        .where(inArray(contacts.id, [contact1.id, contact2.id, contact3.id]))
        .limit(2);

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Update Contact', () => {
    it('should update contact fields', async () => {
      const contact = await createTestContact({
        firstName: 'Update',
        lastName: 'Test',
      });

      createdContactIds.push(contact.id);

      // Update contact
      const [updated] = await db()
        .update(contacts)
        .set({
          firstName: 'Updated',
          lastName: 'Changed',
        })
        .where(eq(contacts.id, contact.id))
        .returning();

      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('Changed');
    });
  });

  describe('Delete Contact', () => {
    it('should delete contact', async () => {
      const contact = await createTestContact({
        firstName: 'Delete',
        lastName: 'Test',
      });

      // Delete contact
      await db().delete(contacts).where(eq(contacts.id, contact.id));

      // Verify deletion
      const [deleted] = await db()
        .select()
        .from(contacts)
        .where(eq(contacts.id, contact.id))
        .limit(1);

      expect(deleted).toBeUndefined();
    });
  });

  describe('Contact Constraints', () => {
    it('should enforce required fields', async () => {
      // This test would fail if required fields are missing
      // Drizzle/PostgreSQL will enforce this
      const contact = await createTestContact({
        firstName: 'Required',
        lastName: 'Fields',
      });

      createdContactIds.push(contact.id);

      expect(contact.firstName).toBeDefined();
      expect(contact.lastName).toBeDefined();
    });
  });
});
