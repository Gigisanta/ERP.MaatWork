/**
 * CDK Configuration Generator
 *
 * AI_DECISION: Crear generador de configuraciones dinámico
 * Justificación: Reducir duplicación de configuraciones hardcoded
 * Impacto: Configuraciones más mantenibles y consistentes
 */

import { CactusConfig, DeploymentMode, Environment } from './types';

/**
 * Base configuration factory
 */
function createBaseConfig(
  mode: DeploymentMode,
  environment: Environment
): Omit<CactusConfig, 'mvpCompute' | 'advancedCompute'> {
  const isProduction = environment === 'prod';
  const isDevelopment = environment === 'dev';

  return {
    mode,
    environment,
    projectName: 'cactus',
    vpc: {
      useDefault: true,
      maxAzs: 2,
      natGateways: 0, // Free tier
    },
    database: {
      instanceType: isDevelopment ? 't3.micro' : 't3.small',
      multiAz: false,
      backupRetentionDays: isDevelopment ? 1 : 7,
      allocatedStorage: isDevelopment ? 20 : 50,
      maxAllocatedStorage: isDevelopment ? 30 : 100,
    },
    monitoring: {
      budgetAmount: isDevelopment ? 35 : 100,
      cpuAlarmThreshold: 80,
      memoryAlarmThreshold: 85,
    },
  };
}

/**
 * MVP configuration factory
 */
function createMvpConfig(environment: Environment): CactusConfig {
  const baseConfig = createBaseConfig('mvp', environment);
  const isDevelopment = environment === 'dev';

  return {
    ...baseConfig,
    mvpCompute: {
      instanceType: isDevelopment ? 't3.small' : 't3.medium',
      volumeSize: isDevelopment ? 30 : 50,
    },
  };
}

/**
 * Advanced configuration factory
 */
function createAdvancedConfig(environment: Environment): CactusConfig {
  const baseConfig = createBaseConfig('advanced', environment);
  const isProduction = environment === 'prod';

  return {
    ...baseConfig,
    advancedCompute: {
      instanceType: isProduction ? 't3.medium' : 't3.small',
      minCapacity: isProduction ? 2 : 1,
      maxCapacity: isProduction ? 10 : 3,
      volumeSize: isProduction ? 50 : 30,
    },
  };
}

/**
 * Configuration presets
 */
export const CONFIG_PRESETS = {
  // MVP configurations
  MVP_DEV: () => createMvpConfig('dev'),
  MVP_PROD: () => createMvpConfig('prod'),

  // Advanced configurations
  ADVANCED_DEV: () => createAdvancedConfig('dev'),
  ADVANCED_PROD: () => createAdvancedConfig('prod'),
} as const;

/**
 * Get configuration by preset name
 */
export function getConfig(preset: keyof typeof CONFIG_PRESETS): CactusConfig {
  return CONFIG_PRESETS[preset]();
}

/**
 * Create custom configuration with overrides
 */
export function createCustomConfig(
  basePreset: keyof typeof CONFIG_PRESETS,
  overrides: Partial<CactusConfig>
): CactusConfig {
  const baseConfig = getConfig(basePreset);
  return { ...baseConfig, ...overrides };
}

// Legacy exports for backward compatibility
export const MVP_DEV_CONFIG = CONFIG_PRESETS.MVP_DEV();
export const MVP_PROD_CONFIG = CONFIG_PRESETS.MVP_PROD();
export const ADVANCED_DEV_CONFIG = CONFIG_PRESETS.ADVANCED_DEV();
export const ADVANCED_PROD_CONFIG = CONFIG_PRESETS.ADVANCED_PROD();

