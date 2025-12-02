/**
 * Mock helpers for @cactus/db
 *
 * Provides factory functions to create complete mocks of Drizzle ORM query chains
 * for unit tests that don't require a real database connection.
 */

import { vi } from 'vitest';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Creates a mock query builder chain for Drizzle ORM
 * Supports: db().select().from().where().limit() etc.
 */
export function createMockQueryBuilder<T = unknown>(mockData: T[] = []) {
  const mockLimit = vi.fn().mockResolvedValue(mockData);
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

  return {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    // Support for other query methods
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(mockData),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockData),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    execute: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a complete mock of db() function
 * Returns a mock that supports all Drizzle query patterns
 */
export function createMockDb(mockData: Record<string, unknown[]> = {}) {
  const mockDbInstance = {
    select: vi.fn((columns?: unknown) => {
      const builder = createMockQueryBuilder();
      // If columns provided, return the builder
      return builder.select(columns);
    }),
    insert: vi.fn((table: unknown) => {
      const tableName = String(table);
      const data = mockData[tableName] || [];
      const builder = createMockQueryBuilder(data);
      return builder.insert(table);
    }),
    update: vi.fn((table: unknown) => {
      const tableName = String(table);
      const data = mockData[tableName] || [];
      const builder = createMockQueryBuilder(data);
      return builder.update(table);
    }),
    delete: vi.fn((table: unknown) => {
      const builder = createMockQueryBuilder();
      return builder.delete(table);
    }),
    execute: vi.fn().mockResolvedValue(undefined),
  };

  // Support for db().select().from().where() pattern
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  });

  mockDbInstance.select = mockSelect;

  return vi.fn(() => mockDbInstance as unknown as NodePgDatabase<Record<string, unknown>>);
}

/**
 * Creates a mock db() with specific query responses
 * Useful for tests that need to control exact query results
 */
export function createMockDbWithResponses(responses: {
  select?: Record<string, unknown[]>;
  insert?: Record<string, unknown[]>;
  update?: Record<string, unknown[]>;
  delete?: Record<string, void>;
}) {
  const mockDbInstance: Record<string, unknown> = {
    select: vi.fn((columns?: unknown) => {
      const mockFrom = vi.fn((table: unknown) => {
        const tableName = String(table);
        const tableData = responses.select?.[tableName] || [];

        const mockWhere = vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(tableData),
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(tableData),
            }),
          }),
        });

        return {
          where: mockWhere,
          limit: vi.fn().mockResolvedValue(tableData),
        };
      });

      return { from: mockFrom };
    }),
    insert: vi.fn((table: unknown) => {
      const tableName = String(table);
      const insertData = responses.insert?.[tableName] || [];

      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(insertData),
        }),
      };
    }),
    update: vi.fn((table: unknown) => {
      const tableName = String(table);
      const updateData = responses.update?.[tableName] || [];

      return {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(updateData),
          }),
        }),
      };
    }),
    delete: vi.fn((table: unknown) => {
      return {
        where: vi.fn().mockResolvedValue(undefined),
      };
    }),
    execute: vi.fn().mockResolvedValue(undefined),
  };

  return vi.fn(() => mockDbInstance as unknown as NodePgDatabase<Record<string, unknown>>);
}

/**
 * Helper to create a mock db() that returns specific data for a query pattern
 * Example: createMockDbForQuery('users', [{ id: '1', email: 'test@test.com' }])
 */
export function createMockDbForQuery(tableName: string, data: unknown[]) {
  return createMockDbWithResponses({
    select: { [tableName]: data },
  });
}
