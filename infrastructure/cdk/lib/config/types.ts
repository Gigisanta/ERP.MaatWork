import { StackProps } from 'aws-cdk-lib';

/**
 * Modo de deployment
 * - mvp: EC2 single instance con Docker Compose
 * - advanced: ECS Fargate con ALB y auto-scaling
 */
export type DeploymentMode = 'mvp' | 'advanced';

/**
 * Ambiente de deployment
 */
export type Environment = 'dev' | 'prod';

/**
 * Configuración de VPC
 */
export interface VpcConfig {
    /** Usar VPC por defecto (true para MVP, false para Advanced) */
    useDefault: boolean;
    /** Número máximo de zonas de disponibilidad */
    maxAzs: number;
    /** Número de NAT Gateways (0 para MVP, 1-2 para Advanced) */
    natGateways: number;
}

/**
 * Configuración de base de datos RDS
 */
export interface DatabaseConfig {
    /** Tipo de instancia (ej: t3.micro, t3.small) */
    instanceType: string;
    /** Habilitar Multi-AZ para alta disponibilidad */
    multiAz: boolean;
    /** Días de retención de backups */
    backupRetentionDays: number;
    /** Almacenamiento inicial en GB */
    allocatedStorage: number;
    /** Almacenamiento máximo para auto-scaling en GB */
    maxAllocatedStorage: number;
}

/**
 * Configuración de compute para MVP (EC2)
 */
export interface MvpComputeConfig {
    /** Tipo de instancia EC2 */
    instanceType: string;
    /** Tamaño del volumen EBS en GB */
    volumeSize: number;
}

/**
 * Configuración de compute para Advanced (ECS Fargate)
 */
export interface AdvancedComputeConfig {
    /** CPU units para Fargate (256, 512, 1024, etc) */
    cpu: number;
    /** Memoria en MiB para Fargate */
    memoryLimitMiB: number;
    /** Número deseado de tasks */
    desiredCount: number;
    /** Número mínimo de tasks para auto-scaling */
    minCount: number;
    /** Número máximo de tasks para auto-scaling */
    maxCount: number;
    /** Habilitar auto-scaling */
    enableAutoScaling: boolean;
}

/**
 * Configuración de monitoring
 */
export interface MonitoringConfig {
    /** Email para alarmas (opcional) */
    alarmEmail?: string;
    /** Presupuesto mensual en USD */
    budgetAmount: number;
    /** Umbral de CPU para alarma (%) */
    cpuAlarmThreshold: number;
    /** Umbral de memoria para alarma (%) */
    memoryAlarmThreshold: number;
}

/**
 * Configuración completa de Cactus
 */
export interface CactusConfig {
    /** Modo de deployment */
    mode: DeploymentMode;
    /** Ambiente */
    environment: Environment;
    /** Nombre del proyecto para tags */
    projectName: string;
    /** Configuración de VPC */
    vpc: VpcConfig;
    /** Configuración de base de datos */
    database: DatabaseConfig;
    /** Configuración de compute MVP (solo si mode === 'mvp') */
    mvpCompute?: MvpComputeConfig;
    /** Configuración de compute Advanced (solo si mode === 'advanced') */
    advancedCompute?: AdvancedComputeConfig;
    /** Configuración de monitoring */
    monitoring: MonitoringConfig;
}

/**
 * Props para stacks de Cactus
 */
export interface CactusStackProps extends StackProps {
    config: CactusConfig;
}

/**
 * Resultado de la creación de recursos de compute
 */
export interface ComputeResources {
    /** URL de la API */
    apiUrl: string;
    /** URL de la aplicación web */
    webUrl: string;
    /** URL del servicio de analytics */
    analyticsUrl: string;
}
