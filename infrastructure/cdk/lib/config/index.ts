/**
 * CDK Configuration - Generated configurations
 *
 * AI_DECISION: Reemplazar configuraciones hardcoded con generador dinámico
 * Justificación: Reducir duplicación y mejorar mantenibilidad
 * Impacto: Configuraciones más consistentes y fáciles de mantener
 */

export {
  CONFIG_PRESETS,
  getConfig,
  createCustomConfig,
  MVP_DEV_CONFIG,
  MVP_PROD_CONFIG,
  ADVANCED_DEV_CONFIG,
  ADVANCED_PROD_CONFIG,
} from './generator';

// Re-export types for convenience
export type { CactusConfig, DeploymentMode, Environment } from './types';
