import * as cdk from 'aws-cdk-lib';
import { CactusConfig, DeploymentMode, Environment } from './types';

// ============================================================================
// CONFIGURACIONES PREDEFINIDAS
// ============================================================================

/**
 * MVP Development - Mínimo viable para desarrollo
 * Costo estimado: ~$20/mes (primer año con free tier)
 */
export const MVP_DEV_CONFIG: CactusConfig = {
    mode: 'mvp',
    environment: 'dev',
    projectName: 'cactus',
    vpc: {
        useDefault: true,
        maxAzs: 2,
        natGateways: 0,
    },
    database: {
        instanceType: 't3.micro',
        multiAz: false,
        backupRetentionDays: 1,
        allocatedStorage: 20,
        maxAllocatedStorage: 30,
    },
    mvpCompute: {
        instanceType: 't3.small',
        volumeSize: 30,
    },
    monitoring: {
        budgetAmount: 35,
        cpuAlarmThreshold: 80,
        memoryAlarmThreshold: 85,
    },
};

/**
 * MVP Production - Mínimo viable para producción
 * Costo estimado: ~$35/mes (después del free tier)
 */
export const MVP_PROD_CONFIG: CactusConfig = {
    mode: 'mvp',
    environment: 'prod',
    projectName: 'cactus',
    vpc: {
        useDefault: true,
        maxAzs: 2,
        natGateways: 0,
    },
    database: {
        instanceType: 't3.micro',
        multiAz: false,
        backupRetentionDays: 7,
        allocatedStorage: 20,
        maxAllocatedStorage: 50,
    },
    mvpCompute: {
        instanceType: 't3.small',
        volumeSize: 30,
    },
    monitoring: {
        budgetAmount: 50,
        cpuAlarmThreshold: 75,
        memoryAlarmThreshold: 80,
    },
};

/**
 * Advanced Development - Escalable para desarrollo
 * Costo estimado: ~$70/mes
 */
export const ADVANCED_DEV_CONFIG: CactusConfig = {
    mode: 'advanced',
    environment: 'dev',
    projectName: 'cactus',
    vpc: {
        useDefault: false,
        maxAzs: 2,
        natGateways: 1,
    },
    database: {
        instanceType: 't3.micro',
        multiAz: false,
        backupRetentionDays: 1,
        allocatedStorage: 20,
        maxAllocatedStorage: 50,
    },
    advancedCompute: {
        cpu: 256,
        memoryLimitMiB: 512,
        desiredCount: 1,
        minCount: 1,
        maxCount: 2,
        enableAutoScaling: false,
    },
    monitoring: {
        budgetAmount: 100,
        cpuAlarmThreshold: 80,
        memoryAlarmThreshold: 85,
    },
};

/**
 * Advanced Production - Escalable para producción
 * Costo estimado: ~$150/mes
 */
export const ADVANCED_PROD_CONFIG: CactusConfig = {
    mode: 'advanced',
    environment: 'prod',
    projectName: 'cactus',
    vpc: {
        useDefault: false,
        maxAzs: 2,
        natGateways: 2,
    },
    database: {
        instanceType: 't3.small',
        multiAz: true,
        backupRetentionDays: 7,
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
    },
    advancedCompute: {
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 2,
        minCount: 2,
        maxCount: 10,
        enableAutoScaling: true,
    },
    monitoring: {
        budgetAmount: 200,
        cpuAlarmThreshold: 70,
        memoryAlarmThreshold: 75,
    },
};

// ============================================================================
// DICCIONARIO DE CONFIGURACIONES
// ============================================================================

const CONFIG_MAP: Record<string, CactusConfig> = {
    'mvp-dev': MVP_DEV_CONFIG,
    'mvp-prod': MVP_PROD_CONFIG,
    'advanced-dev': ADVANCED_DEV_CONFIG,
    'advanced-prod': ADVANCED_PROD_CONFIG,
};

// ============================================================================
// VALIDACIÓN DE CONFIGURACIÓN
// ============================================================================

export class ConfigValidationError extends Error {
    constructor(message: string) {
        super(`Configuration Error: ${message}`);
        this.name = 'ConfigValidationError';
    }
}

/**
 * Valida que la configuración no tenga conflictos
 * @throws ConfigValidationError si hay configuraciones contradictorias
 */
export function validateConfig(config: CactusConfig): void {
    const errors: string[] = [];

    // Validar que MVP no use features de Advanced
    if (config.mode === 'mvp') {
        if (config.advancedCompute !== undefined) {
            errors.push('MVP mode cannot have advancedCompute configuration. Remove advancedCompute or change mode to "advanced".');
        }
        if (config.mvpCompute === undefined) {
            errors.push('MVP mode requires mvpCompute configuration.');
        }
        if (!config.vpc.useDefault) {
            errors.push('MVP mode must use default VPC (vpc.useDefault must be true).');
        }
        if (config.vpc.natGateways > 0) {
            errors.push('MVP mode cannot use NAT Gateways (vpc.natGateways must be 0).');
        }
    }

    // Validar que Advanced tenga la configuración correcta
    if (config.mode === 'advanced') {
        if (config.mvpCompute !== undefined) {
            errors.push('Advanced mode cannot have mvpCompute configuration. Remove mvpCompute or change mode to "mvp".');
        }
        if (config.advancedCompute === undefined) {
            errors.push('Advanced mode requires advancedCompute configuration.');
        }
        if (config.vpc.useDefault) {
            errors.push('Advanced mode must use custom VPC (vpc.useDefault must be false).');
        }
        if (config.vpc.natGateways < 1) {
            errors.push('Advanced mode requires at least 1 NAT Gateway.');
        }
    }

    // Validar requisitos de producción
    if (config.environment === 'prod') {
        if (config.database.backupRetentionDays < 7) {
            errors.push('Production environment requires at least 7 days of backup retention.');
        }
        if (config.monitoring.budgetAmount < 30) {
            errors.push('Production environment budget seems too low. Set at least $30.');
        }
    }

    // Validar límites de recursos
    if (config.database.allocatedStorage < 20) {
        errors.push('Minimum database storage is 20 GB.');
    }
    if (config.database.maxAllocatedStorage < config.database.allocatedStorage) {
        errors.push('maxAllocatedStorage must be >= allocatedStorage.');
    }

    // Validar auto-scaling
    if (config.advancedCompute?.enableAutoScaling) {
        if (config.advancedCompute.maxCount <= config.advancedCompute.minCount) {
            errors.push('When auto-scaling is enabled, maxCount must be > minCount.');
        }
    }

    // Si hay errores, lanzar excepción con todos los errores
    if (errors.length > 0) {
        throw new ConfigValidationError(
            `Found ${errors.length} configuration error(s):\n` +
            errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')
        );
    }
}

// ============================================================================
// OBTENER CONFIGURACIÓN
// ============================================================================

/**
 * Obtiene la configuración basada en el contexto de CDK
 * 
 * @example
 * ```bash
 * # MVP en dev
 * cdk deploy --context mode=mvp --context env=dev
 * 
 * # Advanced en prod
 * cdk deploy --context mode=advanced --context env=prod
 * ```
 */
export function getConfig(app: cdk.App): CactusConfig {
    const mode = app.node.tryGetContext('mode') as DeploymentMode || 'mvp';
    const env = app.node.tryGetContext('env') as Environment || 'dev';

    const configKey = `${mode}-${env}`;
    const config = CONFIG_MAP[configKey];

    if (!config) {
        throw new ConfigValidationError(
            `Unknown configuration: mode="${mode}", env="${env}". ` +
            `Valid combinations are: ${Object.keys(CONFIG_MAP).join(', ')}`
        );
    }

    // Validar la configuración
    validateConfig(config);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CACTUS INFRASTRUCTURE                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Mode:        ${config.mode.toUpperCase().padEnd(44)}║`);
    console.log(`║  Environment: ${config.environment.toUpperCase().padEnd(44)}║`);
    console.log(`║  VPC:         ${(config.vpc.useDefault ? 'Default' : 'Custom').padEnd(44)}║`);
    console.log(`║  Compute:     ${(config.mode === 'mvp' ? 'EC2 ' + config.mvpCompute?.instanceType : 'ECS Fargate').padEnd(44)}║`);
    console.log(`║  Database:    ${('RDS ' + config.database.instanceType + (config.database.multiAz ? ' Multi-AZ' : '')).padEnd(44)}║`);
    console.log(`║  Budget:      $${config.monitoring.budgetAmount.toString().padEnd(43)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    return config;
}

// Re-exportar tipos específicos para tree-shaking
export type {
  DeploymentMode,
  Environment,
  VpcConfig,
  DatabaseConfig,
  MvpComputeConfig,
  AdvancedComputeConfig,
  MonitoringConfig,
  CactusConfig,
  CactusStackProps,
  ComputeResources,
} from './types';
