/**
 * Mapeo flexible de columnas CSV para AUM
 *
 * AI_DECISION: Re-exportar desde módulos refactorizados para mantener compatibilidad
 * Justificación: Mantener imports existentes funcionando mientras se migra gradualmente
 * Impacto: Compatibilidad hacia atrás, migración gradual sin romper código existente
 * Referencias: apps/api/src/utils/aum-columns/
 *
 * Este archivo ahora re-exporta desde apps/api/src/utils/aum-columns/
 * Los nuevos imports deberían usar directamente desde aum-columns/
 *
 * @deprecated Este archivo es solo para compatibilidad hacia atrás.
 *            Nuevos imports deben usar directamente desde './aum-columns'
 */

// Re-exportar todo desde el nuevo módulo para compatibilidad hacia atrás
export {
  normalizeColumnName,
  findColumnByPatterns,
  mapAumColumns,
  validateColumnMapping,
  safeToString,
  safeToNumber,
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
  type MappedAumColumns,
  type ColumnMappingValidation,
} from './aum-columns';
