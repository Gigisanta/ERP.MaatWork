/**
 * AUM Upsert Service
 *
 * Re-exports from modular structure in ./aum/ for backward compatibility.
 *
 * AI_DECISION: Refactorizado a estructura modular en ./aum/
 * Justificación: Archivo original de 808 líneas con funciones >100 líneas, dividido en módulos especializados
 * Impacto: Mejor mantenibilidad, funciones más testeables, código más navegable
 *
 * Estructura modular:
 * - ./aum/types.ts - Tipos compartidos (AumRowInsert, ExistingRow, etc.)
 * - ./aum/strategies/ - Estrategias de búsqueda (idCuenta, accountNumber, holderName)
 * - ./aum/find-existing.ts - Orquestador de estrategias de búsqueda
 * - ./aum/update-row.ts - Lógica de actualización con reglas de preservación
 * - ./aum/insert-row.ts - Lógica de inserción
 * - ./aum/upsert.ts - Función principal de upsert con batch processing
 * - ./aum/monthly-snapshots.ts - Snapshots mensuales
 * - ./aum/advisor-mapping.ts - Mapeo advisor-cuenta
 * - ./aum/helpers.ts - Funciones auxiliares
 */

// Re-export everything from the modular structure
export type {
  AumRowInsert,
  AumRowDbResult,
  UpsertStats,
  UpsertResult,
  ExistingRow,
  AumMonthlySnapshotInsert,
  MonthlySnapshotUpsertStats,
  MonthlySnapshotUpsertResult,
} from './aum';

export {
  // Main functions
  upsertAumRows,
  findExistingRow,
  updateExistingRow,
  insertNewRow,
  applyAdvisorAccountMapping,
  upsertAumMonthlySnapshots,

  // Helpers
  detectAccountNumberChange,

  // Strategies (for advanced usage/testing)
  findByIdCuenta,
  findByReverseLookup,
  findByAccountNumber,
  findByHolderName,
  hasOnlyHolderName,
} from './aum';
