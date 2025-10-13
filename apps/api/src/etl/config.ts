/**
 * Módulo de configuración del ETL
 * Centraliza la gestión de parámetros configurables
 */

export interface ETLConfig {
  parsing: {
    breakdownTolerance: number;
    breakdownTolerancePercent: number;
    headerRow: number;
    skipEmptyRows: boolean;
  };
  matching: {
    fuzzyEnabled: boolean;
    fuzzyThreshold: number;
    exactMatchPriority: boolean;
    multiMatchAction: 'warn' | 'error' | 'allow';
  };
  validation: {
    minAUMThreshold: number;
    maxAUMThreshold: number;
    requireClientMatch: boolean;
    allowZeroCommissions: boolean;
  };
  processing: {
    batchSize: number;
    maxRetries: number;
    timeoutMs: number;
    enableParallelProcessing: boolean;
  };
  logging: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logParsingDetails: boolean;
    logMatchingDetails: boolean;
    saveLogsToFile: boolean;
  };
}

export const defaultETLConfig: ETLConfig = {
  parsing: {
    breakdownTolerance: 10.0, // Aumentado de 0.1 a 10 USD para tolerar diferencias de redondeo
    breakdownTolerancePercent: 5.0, // Aumentado de 1% a 5% para ser más permisivo
    headerRow: 1,
    skipEmptyRows: true
  },
  matching: {
    fuzzyEnabled: true,
    fuzzyThreshold: 2,
    exactMatchPriority: true,
    multiMatchAction: 'warn'
  },
  validation: {
    minAUMThreshold: 0,
    maxAUMThreshold: 1000000000,
    requireClientMatch: false,
    allowZeroCommissions: true
  },
  processing: {
    batchSize: 1000,
    maxRetries: 3,
    timeoutMs: 300000,
    enableParallelProcessing: true
  },
  logging: {
    logLevel: 'info',
    logParsingDetails: false,
    logMatchingDetails: false,
    saveLogsToFile: true
  }
};

// Configuración actual (por defecto, se puede sobrescribir)
let currentConfig: ETLConfig = { ...defaultETLConfig };

/**
 * Obtiene la configuración actual
 */
export function getETLConfig(): ETLConfig {
  return currentConfig;
}

/**
 * Actualiza la configuración
 */
export function setETLConfig(config: Partial<ETLConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    parsing: { ...currentConfig.parsing, ...config.parsing },
    matching: { ...currentConfig.matching, ...config.matching },
    validation: { ...currentConfig.validation, ...config.validation },
    processing: { ...currentConfig.processing, ...config.processing },
    logging: { ...currentConfig.logging, ...config.logging }
  };
}

/**
 * Resetea la configuración a los valores por defecto
 */
export function resetETLConfig(): void {
  currentConfig = { ...defaultETLConfig };
}

/**
 * Obtiene la configuración de parsing
 */
export function getParsingConfig() {
  return currentConfig.parsing;
}

/**
 * Obtiene la configuración de matching
 */
export function getMatchingConfig() {
  return currentConfig.matching;
}

/**
 * Obtiene la configuración de validación
 */
export function getValidationConfig() {
  return currentConfig.validation;
}

/**
 * Obtiene la configuración de procesamiento
 */
export function getProcessingConfig() {
  return currentConfig.processing;
}

/**
 * Obtiene la configuración de logging
 */
export function getLoggingConfig() {
  return currentConfig.logging;
}


