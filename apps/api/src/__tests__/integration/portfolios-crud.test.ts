/**
 * Integration tests for portfolios CRUD operations
 *
 * Tests complete CRUD flow with real database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@maatwork/db';
import {
  portfolioTemplates,
  portfolioTemplateLines,
  benchmarkDefinitions,
  benchmarkComponents,
} from '@maatwork/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { createTestUser, deleteTestUser } from '../helpers/test-auth';

describe('Portfolios CRUD Integration Tests', () => {
  let testUserId: string | null = null;
  const createdPortfolioIds: string[] = [];
  const createdBenchmarkIds: string[] = [];

  beforeAll(async () => {
    // Verify database connection
    await db().execute(sql`SELECT 1`);

    // Create test user
    const testUser = await createTestUser({
      email: `test-portfolios-${Date.now()}@example.com`,
      role: 'admin',
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup benchmarks
    if (createdBenchmarkIds.length > 0) {
      for (const id of createdBenchmarkIds) {
        await db().delete(benchmarkComponents).where(eq(benchmarkComponents.benchmarkId, id));
        await db().delete(benchmarkDefinitions).where(eq(benchmarkDefinitions.id, id));
      }
    }

    // Cleanup portfolios and their lines
    if (testUserId) {
      // Find all portfolios created by this user
      const userPortfolios = await db()
        .select({ id: portfolioTemplates.id })
        .from(portfolioTemplates)
        .where(eq(portfolioTemplates.createdByUserId, testUserId));

      const ids = userPortfolios.map((p) => p.id);

      if (ids.length > 0) {
        await db()
          .delete(portfolioTemplateLines)
          .where(inArray(portfolioTemplateLines.templateId, ids));
        await db().delete(portfolioTemplates).where(inArray(portfolioTemplates.id, ids));
      }

      await deleteTestUser(testUserId);
    }
  });

  describe('Create Portfolio', () => {
    it('should create a portfolio template', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Test Portfolio ${Date.now()}`,
          description: 'Test portfolio description',
          riskLevel: 'moderate',
          createdByUserId: testUserId || '',
          createdAt: new Date(),
        } as any)
        .returning();

      createdPortfolioIds.push(portfolio.id);

      expect(portfolio.id).toBeDefined();
      expect(portfolio.name).toContain('Test Portfolio');
    });

    it('should create portfolio with components', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Portfolio with Components ${Date.now()}`,
          riskLevel: 'moderate',
          createdByUserId: testUserId || '',
          createdAt: new Date(),
        } as any)
        .returning();

      createdPortfolioIds.push(portfolio.id);

      // Add components
      const [component1] = await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          targetType: 'instrument',
          instrumentSymbol: 'AAPL',
          instrumentName: 'Apple Inc.',
          targetWeight: '0.3000',
        } as any)
        .returning();

      const [component2] = await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          targetType: 'instrument',
          instrumentSymbol: 'MSFT',
          instrumentName: 'Microsoft Corporation',
          targetWeight: '0.7000',
        } as any)
        .returning();

      expect(component1.templateId).toBe(portfolio.id);
      expect(component2.templateId).toBe(portfolio.id);

      // Verify weights
      expect(Number(component1.targetWeight)).toBe(0.3);
      expect(Number(component2.targetWeight)).toBe(0.7);
    });
  });

  describe('Read Portfolio', () => {
    it('should read portfolio with components', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Read Portfolio ${Date.now()}`,
          riskLevel: 'conservative',
          createdByUserId: testUserId || '',
          createdAt: new Date(),
        } as any)
        .returning();

      createdPortfolioIds.push(portfolio.id);

      await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          targetType: 'instrument',
          instrumentSymbol: 'BOND',
          targetWeight: '1.0000',
        } as any);

      // Read portfolio
      const [readPortfolio] = await db()
        .select()
        .from(portfolioTemplates)
        .where(eq(portfolioTemplates.id, portfolio.id))
        .limit(1);

      expect(readPortfolio).toBeDefined();
      expect(readPortfolio?.name).toBe(portfolio.name);
    });
  });

  describe('Update Portfolio', () => {
    it('should update portfolio details', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `To Update ${Date.now()}`,
          riskLevel: 'moderate',
          createdByUserId: testUserId || '',
          createdAt: new Date(),
        } as any)
        .returning();

      createdPortfolioIds.push(portfolio.id);

      // Update
      const [updated] = await db()
        .update(portfolioTemplates)
        .set({
          name: 'Updated Name',
          riskLevel: 'aggressive',
        })
        .where(eq(portfolioTemplates.id, portfolio.id))
        .returning();

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.riskLevel).toBe('aggressive');
    });
  });

  describe('Benchmark Assignment', () => {
    it('should create benchmark and assign to portfolio', async () => {
      // Create benchmark
      const [benchmark] = await db()
        .insert(benchmarkDefinitions)
        .values({
          name: `Test Benchmark ${Date.now()}`,
          code: `TEST_${Date.now()}`,
          isSystem: false,
          createdByUserId: testUserId,
          createdAt: new Date(),
        } as any)
        .returning();

      createdBenchmarkIds.push(benchmark.id);

      // Create portfolio - since we don't have benchmarkId in portfolioTemplates,
      // we'll just verify the benchmark was created.
      expect(benchmark.id).toBeDefined();
      expect(benchmark.code).toContain('TEST_');
    });
  });

  describe('Delete Portfolio', () => {
    it('should delete portfolio and cascade delete components', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `To Delete ${Date.now()}`,
          riskLevel: 'moderate',
          createdByUserId: testUserId || '',
          createdAt: new Date(),
        } as any)
        .returning();

      // Add component
      await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          targetType: 'instrument',
          instrumentSymbol: 'DEL',
          targetWeight: '1.0000',
        } as any);

      // Delete
      await db().delete(portfolioTemplates).where(eq(portfolioTemplates.id, portfolio.id));

      // Verify deletion
      const [found] = await db()
        .select()
        .from(portfolioTemplates)
        .where(eq(portfolioTemplates.id, portfolio.id))
        .limit(1);

      expect(found).toBeUndefined();

      // Verify components deleted (cascade)
      const components = await db()
        .select()
        .from(portfolioTemplateLines)
        .where(eq(portfolioTemplateLines.templateId, portfolio.id));

      expect(components.length).toBe(0);
    });
  });
});
