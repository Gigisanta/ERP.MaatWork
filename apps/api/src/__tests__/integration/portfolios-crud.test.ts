/**
 * Integration tests for portfolios CRUD operations
 * 
 * Tests portfolio creation, component management, and benchmark assignment
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@cactus/db';
import {
  portfolioTemplates,
  portfolioTemplateLines,
  benchmarkDefinitions,
  benchmarkComponents,
} from '@cactus/db/schema';
import { eq } from 'drizzle-orm';
import { createTestUser, deleteTestUser } from '../../helpers/test-auth';
import { createTestContact, cleanupTestFixtures } from '../../helpers/test-fixtures';

describe('Portfolios CRUD Integration Tests', () => {
  let testUserId: string | null = null;
  let createdPortfolioIds: string[] = [];
  let createdBenchmarkIds: string[] = [];
  let contactIds: string[] = [];

  beforeAll(async () => {
    // Create test user
    const testUser = await createTestUser({
      email: `test-portfolios-${Date.now()}@example.com`,
      role: 'advisor',
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup portfolios
    if (createdPortfolioIds.length > 0) {
      for (const id of createdPortfolioIds) {
        // Delete template lines first (cascade should handle this, but being explicit)
        await db()
          .delete(portfolioTemplateLines)
          .where(eq(portfolioTemplateLines.templateId, id));

        await db()
          .delete(portfolioTemplates)
          .where(eq(portfolioTemplates.id, id));
      }
    }

    // Cleanup benchmarks
    if (createdBenchmarkIds.length > 0) {
      for (const id of createdBenchmarkIds) {
        await db()
          .delete(benchmarkComponents)
          .where(eq(benchmarkComponents.benchmarkId, id));

        await db()
          .delete(benchmarkDefinitions)
          .where(eq(benchmarkDefinitions.id, id));
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

  describe('Create Portfolio', () => {
    it('should create a portfolio template', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Test Portfolio ${Date.now()}`,
          description: 'Test portfolio description',
          riskLevel: 'moderate',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
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
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdPortfolioIds.push(portfolio.id);

      // Add components
      const [component1] = await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          instrumentSymbol: 'AAPL',
          instrumentName: 'Apple Inc.',
          targetWeight: 0.3,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const [component2] = await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          instrumentSymbol: 'MSFT',
          instrumentName: 'Microsoft Corporation',
          targetWeight: 0.7,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      expect(component1.templateId).toBe(portfolio.id);
      expect(component2.templateId).toBe(portfolio.id);

      // Verify weights sum to 1.0
      const totalWeight = component1.targetWeight + component2.targetWeight;
      expect(totalWeight).toBe(1.0);
    });
  });

  describe('Read Portfolio', () => {
    it('should read portfolio with components', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Read Portfolio ${Date.now()}`,
          riskLevel: 'conservative',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdPortfolioIds.push(portfolio.id);

      await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          instrumentSymbol: 'BOND',
          targetWeight: 1.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Read portfolio with components
      const [readPortfolio] = await db()
        .select()
        .from(portfolioTemplates)
        .where(eq(portfolioTemplates.id, portfolio.id))
        .limit(1);

      const components = await db()
        .select()
        .from(portfolioTemplateLines)
        .where(eq(portfolioTemplateLines.templateId, portfolio.id));

      expect(readPortfolio).toBeDefined();
      expect(components.length).toBeGreaterThan(0);
    });
  });

  describe('Update Portfolio', () => {
    it('should update portfolio details', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Update Portfolio ${Date.now()}`,
          riskLevel: 'moderate',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdPortfolioIds.push(portfolio.id);

      // Update portfolio
      const [updated] = await db()
        .update(portfolioTemplates)
        .set({
          name: 'Updated Portfolio Name',
          riskLevel: 'aggressive',
        })
        .where(eq(portfolioTemplates.id, portfolio.id))
        .returning();

      expect(updated?.name).toBe('Updated Portfolio Name');
      expect(updated?.riskLevel).toBe('aggressive');
    });

    it('should update portfolio component weights', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Update Components ${Date.now()}`,
          riskLevel: 'moderate',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdPortfolioIds.push(portfolio.id);

      const [component] = await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          instrumentSymbol: 'STOCK',
          targetWeight: 0.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Update component weight
      const [updated] = await db()
        .update(portfolioTemplateLines)
        .set({ targetWeight: 0.75 })
        .where(eq(portfolioTemplateLines.id, component.id))
        .returning();

      expect(updated?.targetWeight).toBe(0.75);
    });
  });

  describe('Benchmark Assignment', () => {
    it('should create benchmark and assign to portfolio', async () => {
      // Create benchmark
      const [benchmark] = await db()
        .insert(benchmarkDefinitions)
        .values({
          name: `Test Benchmark ${Date.now()}`,
          type: 'individual',
          description: 'Test benchmark',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdBenchmarkIds.push(benchmark.id);

      // Add benchmark components
      await db()
        .insert(benchmarkComponents)
        .values({
          benchmarkId: benchmark.id,
          instrumentSymbol: 'SPY',
          instrumentName: 'S&P 500 ETF',
          targetWeight: 1.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      // Create portfolio
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Portfolio with Benchmark ${Date.now()}`,
          riskLevel: 'moderate',
          benchmarkId: benchmark.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      createdPortfolioIds.push(portfolio.id);

      expect(portfolio.benchmarkId).toBe(benchmark.id);

      // Verify benchmark components
      const components = await db()
        .select()
        .from(benchmarkComponents)
        .where(eq(benchmarkComponents.benchmarkId, benchmark.id));

      expect(components.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Portfolio', () => {
    it('should delete portfolio and cascade delete components', async () => {
      const [portfolio] = await db()
        .insert(portfolioTemplates)
        .values({
          name: `Delete Portfolio ${Date.now()}`,
          riskLevel: 'moderate',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add component
      const [component] = await db()
        .insert(portfolioTemplateLines)
        .values({
          templateId: portfolio.id,
          instrumentSymbol: 'TEST',
          targetWeight: 1.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Delete portfolio (should cascade delete components)
      await db()
        .delete(portfolioTemplates)
        .where(eq(portfolioTemplates.id, portfolio.id));

      // Verify portfolio deleted
      const [deleted] = await db()
        .select()
        .from(portfolioTemplates)
        .where(eq(portfolioTemplates.id, portfolio.id))
        .limit(1);

      expect(deleted).toBeUndefined();

      // Verify components deleted (cascade)
      const [deletedComponent] = await db()
        .select()
        .from(portfolioTemplateLines)
        .where(eq(portfolioTemplateLines.id, component.id))
        .limit(1);

      expect(deletedComponent).toBeUndefined();
    });
  });
});

