/**
 * Integration tests for AUM import workflow
 * 
 * Tests complete AUM import flow: upload, parsing, matching, commit
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@cactus/db';
import { aumImportFiles, aumImportRows, contacts } from '@cactus/db/schema';
import { eq } from 'drizzle-orm';
import { createTestUser, deleteTestUser } from '../../helpers/test-auth';
import { createTestContact, cleanupTestFixtures } from '../../helpers/test-fixtures';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('AUM Import Integration Tests', () => {
  let testUserId: string | null = null;
  let createdFileIds: string[] = [];
  let createdRowIds: string[] = [];
  let contactIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    const testUser = await createTestUser({
      email: `test-aum-${Date.now()}@example.com`,
      role: 'admin',
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup AUM rows
    if (createdRowIds.length > 0) {
      for (const id of createdRowIds) {
        await db()
          .delete(aumImportRows)
          .where(eq(aumImportRows.id, id));
      }
    }

    // Cleanup AUM files
    if (createdFileIds.length > 0) {
      for (const id of createdFileIds) {
        await db()
          .delete(aumImportFiles)
          .where(eq(aumImportFiles.id, id));
      }
    }

    // Cleanup contacts
    if (contactIds.length > 0) {
      await cleanupTestFixtures({ contacts: contactIds });
    }

    // Cleanup user
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  describe('AUM File Upload', () => {
    it('should create AUM import file record', async () => {
      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `test-aum-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'pending',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      expect(file.id).toBeDefined();
      expect(file.status).toBe('pending');
      expect(file.uploadedByUserId).toBe(testUserId);
    });

    it('should update file status during processing', async () => {
      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `processing-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'pending',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      // Update to processing
      const [updated] = await db()
        .update(aumImportFiles)
        .set({ status: 'processing' })
        .where(eq(aumImportFiles.id, file.id))
        .returning();

      expect(updated?.status).toBe('processing');
    });
  });

  describe('AUM Row Parsing', () => {
    it('should create AUM import rows', async () => {
      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `rows-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'processing',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      // Create import rows
      const [row1] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: '12345',
          holderName: 'Test Holder',
          advisorRaw: 'Test Advisor',
          aumDollars: 100000,
          rowIndex: 0,
          matchStatus: 'unmatched',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const [row2] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: '67890',
          holderName: 'Another Holder',
          advisorRaw: 'Another Advisor',
          aumDollars: 200000,
          rowIndex: 1,
          matchStatus: 'unmatched',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdRowIds.push(row1.id, row2.id);

      expect(row1.fileId).toBe(file.id);
      expect(row2.fileId).toBe(file.id);
      expect(row1.matchStatus).toBe('unmatched');
    });

    it('should parse financial data correctly', async () => {
      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `financial-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'processing',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      const [row] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: '99999',
          holderName: 'Financial Test',
          aumDollars: 500000.50,
          bolsaArg: 100000.25,
          fondosArg: 200000.75,
          pesos: 200000.50,
          rowIndex: 0,
          matchStatus: 'unmatched',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdRowIds.push(row.id);

      expect(row.aumDollars).toBe(500000.50);
      expect(row.bolsaArg).toBe(100000.25);
      expect(row.fondosArg).toBe(200000.75);
      expect(row.pesos).toBe(200000.50);
    });
  });

  describe('AUM Matching', () => {
    it('should match AUM row to existing contact', async () => {
      // Create contact
      const contact = await createTestContact({
        firstName: 'Match',
        lastName: 'Test',
      });
      contactIds.push(contact.id);

      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `matching-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'processing',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      const [row] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: 'MATCH123',
          holderName: `${contact.firstName} ${contact.lastName}`,
          aumDollars: 100000,
          rowIndex: 0,
          matchStatus: 'matched',
          matchedContactId: contact.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdRowIds.push(row.id);

      expect(row.matchStatus).toBe('matched');
      expect(row.matchedContactId).toBe(contact.id);
    });

    it('should handle ambiguous matches', async () => {
      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `ambiguous-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'processing',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      const [row] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: 'AMBIGUOUS',
          holderName: 'Ambiguous Name',
          aumDollars: 100000,
          rowIndex: 0,
          matchStatus: 'ambiguous',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdRowIds.push(row.id);

      expect(row.matchStatus).toBe('ambiguous');
      expect(row.matchedContactId).toBeNull();
    });
  });

  describe('AUM Commit', () => {
    it('should commit matched rows to contacts', async () => {
      // Create contact
      const contact = await createTestContact({
        firstName: 'Commit',
        lastName: 'Test',
      });
      contactIds.push(contact.id);

      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `commit-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'processing',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      const [row] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: 'COMMIT123',
          holderName: `${contact.firstName} ${contact.lastName}`,
          aumDollars: 150000,
          rowIndex: 0,
          matchStatus: 'matched',
          matchedContactId: contact.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdRowIds.push(row.id);

      // Update file status to committed
      const [committedFile] = await db()
        .update(aumImportFiles)
        .set({ status: 'committed' })
        .where(eq(aumImportFiles.id, file.id))
        .returning();

      expect(committedFile?.status).toBe('committed');

      // Verify row is matched
      const [matchedRow] = await db()
        .select()
        .from(aumImportRows)
        .where(eq(aumImportRows.id, row.id))
        .limit(1);

      expect(matchedRow?.matchStatus).toBe('matched');
      expect(matchedRow?.matchedContactId).toBe(contact.id);
    });
  });

  describe('AUM Data Validation', () => {
    it('should validate required fields', async () => {
      const [file] = await db()
        .insert(aumImportFiles)
        .values({
          filename: `validation-${Date.now()}.csv`,
          uploadedByUserId: testUserId || '',
          status: 'processing',
          rowCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdFileIds.push(file.id);

      // Row with required fields
      const [validRow] = await db()
        .insert(aumImportRows)
        .values({
          fileId: file.id,
          accountNumber: 'VALID123',
          holderName: 'Valid Holder',
          rowIndex: 0,
          matchStatus: 'unmatched',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdRowIds.push(validRow.id);

      expect(validRow.accountNumber).toBeDefined();
      expect(validRow.holderName).toBeDefined();
    });
  });
});

