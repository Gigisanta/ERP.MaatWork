/**
 * Barrel export para módulos de mapeo de columnas AUM
 *
 * Este módulo exporta todas las funciones y tipos relacionados con el mapeo
 * de columnas CSV/Excel a campos AUM.
 */

// Funciones de normalización
export { normalizeColumnName } from './normalize-column-name';

// Funciones de matching y patrones
export {
  findColumnByPatterns,
  ACCOUNT_NUMBER_PATTERNS,
  HOLDER_NAME_PATTERNS,
  ID_CUENTA_PATTERNS,
  ADVISOR_RAW_PATTERNS,
  AUM_DOLLARS_PATTERNS,
  BOLSA_ARG_PATTERNS,
  FONDOS_ARG_PATTERNS,
  BOLSA_BCI_PATTERNS,
  PESOS_PATTERNS,
  MEP_PATTERNS,
  CABLE_PATTERNS,
  CV7000_PATTERNS,
} from './column-pattern-matcher';

// Funciones de validación y conversión
export {
  safeToString,
  safeToNumber,
  validateColumnMapping,
  type ColumnMappingValidation,
} from './column-validator';

// Función principal de mapeo
export { mapAumColumns } from './column-mapper';

// Tipos
export type { MappedAumColumns } from './types';






