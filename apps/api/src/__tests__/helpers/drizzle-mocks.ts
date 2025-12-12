/**
 * Drizzle ORM Mock Helpers
 *
 * AI_DECISION: Helper centralizado para mocks de Drizzle ORM
 * Justificación: Los tests tienen problemas consistentes con mocks de Drizzle
 * Impacto: Mocks más robustos y reutilizables, menos duplicación de código
 *
 * ## Uso
 *
 * ```typescript
 * import { createDrizzleMock } from '@/__tests__/helpers/drizzle-mocks';
 * import { db } from '@cactus/db';
 *
 * const mockDb = vi.mocked(db);
 * const drizzleMock = createDrizzleMock();
 *
 * // Configurar respuestas específicas
 * drizzleMock.setSelectResponse([{ id: '1', name: 'Test' }]);
 * drizzleMock.setExecuteResponse({ rows: [{ total: '10' }] });
 *
 * mockDb.mockReturnValue(drizzleMock.getInstance());
 * ```
 */

import { vi } from 'vitest';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * Configuración para respuestas de queries SELECT
 */
export interface SelectResponse {
  /** Datos a retornar cuando se llama limit() */
  limitData?: unknown[];
  /** Datos a retornar cuando se llama execute() (para SQL templates) */
  executeData?: { rows: unknown[] };
}

/**
 * Configuración para respuestas de queries INSERT
 */
export interface InsertResponse {
  /** Valor a retornar cuando se llama values() */
  valuesResponse?: unknown;
}

/**
 * Configuración para respuestas de queries UPDATE
 */
export interface UpdateResponse {
  /** Valor a retornar cuando se llama where() después de set() */
  whereResponse?: unknown;
}

/**
 * Configuración para respuestas de queries DELETE
 */
export interface DeleteResponse {
  /** Valor a retornar cuando se llama where() */
  whereResponse?: unknown;
}

/**
 * Configuración completa para mocks de Drizzle
 */
export interface DrizzleMockConfig {
  /** Respuestas para queries SELECT (por número de llamada) */
  selectResponses?: SelectResponse[];
  /** Respuestas para queries INSERT */
  insertResponse?: InsertResponse;
  /** Respuestas para queries UPDATE */
  updateResponse?: UpdateResponse;
  /** Respuestas para queries DELETE */
  deleteResponse?: DeleteResponse;
  /** Respuestas para execute() con SQL templates (por número de llamada) */
  executeResponses?: Array<{ rows: unknown[] }>;
}

/**
 * Helper para crear mocks robustos de Drizzle ORM
 *
 * Maneja correctamente:
 * - db().select().from().where().limit()
 * - db().select().from().where().limit() (múltiples llamadas)
 * - db().insert().values()
 * - db().update().set().where()
 * - db().delete().where()
 * - db().execute(sql`...`)
 */
export class DrizzleMock {
  private selectCallCount = 0;
  private executeCallCount = 0;
  private selectResponses: SelectResponse[] = [];
  private executeResponses: Array<{ rows: unknown[] }> = [];
  private insertResponse: InsertResponse = {};
  private updateResponse: UpdateResponse = {};
  private deleteResponse: DeleteResponse = {};

  constructor(config?: DrizzleMockConfig) {
    if (config) {
      this.selectResponses = config.selectResponses || [];
      this.executeResponses = config.executeResponses || [];
      this.insertResponse = config.insertResponse || {};
      this.updateResponse = config.updateResponse || {};
      this.deleteResponse = config.deleteResponse || {};
    }
  }

  /**
   * Configura respuesta para la próxima llamada a select()
   */
  setSelectResponse(response: SelectResponse): void {
    this.selectResponses.push(response);
  }

  /**
   * Configura respuesta para la próxima llamada a execute()
   */
  setExecuteResponse(response: { rows: unknown[] }): void {
    this.executeResponses.push(response);
  }

  /**
   * Configura respuesta para insert().values()
   */
  setInsertResponse(response: InsertResponse): void {
    this.insertResponse = response;
  }

  /**
   * Configura respuesta para update().set().where()
   */
  setUpdateResponse(response: UpdateResponse): void {
    this.updateResponse = response;
  }

  /**
   * Configura respuesta para delete().where()
   */
  setDeleteResponse(response: DeleteResponse): void {
    this.deleteResponse = response;
  }

  /**
   * Resetea los contadores de llamadas (útil en beforeEach)
   */
  reset(): void {
    this.selectCallCount = 0;
    this.executeCallCount = 0;
  }

  /**
   * Obtiene la instancia mock de db() lista para usar
   */
  getInstance(): NodePgDatabase<Record<string, unknown>> {
    const self = this;

    // Mock para select() con múltiples llamadas
    const mockSelect = vi.fn().mockImplementation(() => {
      self.selectCallCount++;
      const response = self.selectResponses[self.selectCallCount - 1];
      const limitData = response?.limitData || [];

      const mockLimit = vi.fn().mockResolvedValue(limitData);
      const mockWhere = vi.fn().mockReturnValue({
        limit: mockLimit,
        // Support for chaining: .where().limit()
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      });
      const mockFrom = vi.fn().mockReturnValue({
        where: mockWhere,
        limit: mockLimit,
      });

      return {
        from: mockFrom,
      };
    });

    // Mock para insert().values()
    const mockInsert = vi.fn((_table: unknown) => ({
      values: vi.fn((_data: unknown) => {
        const response = self.insertResponse.valuesResponse;
        if (response instanceof Promise) {
          return response;
        }
        return Promise.resolve(response || undefined);
      }),
    }));

    // Mock para update().set().where()
    const mockUpdate = vi.fn((_table: unknown) => ({
      set: vi.fn((_data: unknown) => ({
        where: vi.fn((_condition: unknown) => {
          const response = self.updateResponse.whereResponse;
          if (response instanceof Promise) {
            return response;
          }
          return Promise.resolve(response || undefined);
        }),
      })),
    }));

    // Mock para delete().where()
    const mockDelete = vi.fn((_table: unknown) => ({
      where: vi.fn((_condition: unknown) => {
        const response = self.deleteResponse.whereResponse;
        if (response instanceof Promise) {
          return response;
        }
        return Promise.resolve(response || undefined);
      }),
    }));

    // Mock para execute() con SQL templates
    const mockExecute = vi.fn().mockImplementation(() => {
      self.executeCallCount++;
      const response = self.executeResponses[self.executeCallCount - 1];
      if (response) {
        return Promise.resolve(response);
      }
      // Default: return empty rows
      return Promise.resolve({ rows: [] });
    });

    return {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      execute: mockExecute,
    } as unknown as NodePgDatabase<Record<string, unknown>>;
  }
}

/**
 * Factory function para crear un DrizzleMock con configuración inicial
 *
 * @example
 * ```typescript
 * const mock = createDrizzleMock({
 *   selectResponses: [
 *     { limitData: [] }, // Primera llamada a select()
 *     { limitData: [{ id: '1' }] }, // Segunda llamada
 *   ],
 *   executeResponses: [
 *     { rows: [{ total: '10' }] }, // Primera llamada a execute()
 *     { rows: [{ id: '1' }] }, // Segunda llamada
 *   ],
 *   insertResponse: { valuesResponse: undefined },
 * });
 * ```
 */
export function createDrizzleMock(config?: DrizzleMockConfig): DrizzleMock {
  return new DrizzleMock(config);
}

/**
 * Helper rápido para crear un mock básico de db() con respuestas simples
 *
 * @example
 * ```typescript
 * const mockDb = createSimpleDrizzleMock({
 *   selectData: [[], [{ id: '1' }]], // Múltiples respuestas para select()
 *   executeData: [{ rows: [{ total: '10' }] }], // Respuestas para execute()
 * });
 * ```
 */
export function createSimpleDrizzleMock(config: {
  selectData?: unknown[][];
  executeData?: Array<{ rows: unknown[] }>;
}): NodePgDatabase<Record<string, unknown>> {
  const selectResponses: SelectResponse[] =
    config.selectData?.map((data) => ({ limitData: data })) || [];
  const executeResponses = config.executeData || [];

  const mock = createDrizzleMock({
    selectResponses,
    executeResponses,
  });

  return mock.getInstance();
}
