/**
 * Barrel export para módulos de mapeo de columnas AUM
 *
 * Este módulo exporta todas las funciones y tipos relacionados con el mapeo
 * de columnas CSV/Excel a campos AUM.
 */

// Funciones de normalización
export { normalizeColumnName } from './normalize-column-name';

// Funciones de matching y patrones
export { findColumnByPatterns } from './column-pattern-matcher';

// Funciones de validación y conversión
export { validateColumnMapping } from './column-validator';

// Función principal de mapeo
export { mapAumColumns } from './column-mapper';

// Tipos
