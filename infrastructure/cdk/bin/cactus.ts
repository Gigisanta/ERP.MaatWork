#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CactusStack } from '../lib/stacks/cactus-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { getConfig } from '../lib/config';

/**
 * CDK App para infraestructura de Cactus CRM
 *
 * Soporta dos modos de deployment:
 * - MVP: EC2 single instance con Docker Compose (~$20-35/mes)
 * - Advanced: ECS Fargate con ALB y auto-scaling (~$70-150/mes)
 *
 * Uso:
 * ```bash
 * # MVP en desarrollo
 * cdk deploy --context mode=mvp --context env=dev
 *
 * # MVP en producción
 * cdk deploy --context mode=mvp --context env=prod
 *
 * # Advanced en desarrollo
 * cdk deploy --context mode=advanced --context env=dev
 *
 * # Advanced en producción
 * cdk deploy --context mode=advanced --context env=prod
 * ```
 */
const app = new cdk.App();

// Obtener configuración basada en contexto
const config = getConfig(app);

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Nombre del stack basado en configuración
const stackName = `Cactus-${config.mode.charAt(0).toUpperCase() + config.mode.slice(1)}-${config.environment.charAt(0).toUpperCase() + config.environment.slice(1)}`;

// ==================== Main Stack ====================

const mainStack = new CactusStack(app, stackName, {
  env,
  config,
  description: `Cactus CRM - ${config.mode.toUpperCase()} mode (${config.environment})`,
  tags: {
    Project: config.projectName,
    Environment: config.environment,
    Mode: config.mode,
    ManagedBy: 'CDK',
  },
});

// ==================== Monitoring Stack ====================

// El monitoring stack necesita referencias a los recursos creados
// Para MVP, necesitamos pasar la instancia EC2
// Para Advanced, necesitamos pasar el cluster y ALB

// Nota: El MonitoringStack se puede desplegar por separado si es necesario
// Por ahora, las alarmas básicas están incluidas en el CactusStack
// Descomenta las siguientes líneas si quieres un stack de monitoring separado:

/*
new MonitoringStack(app, `${stackName}-Monitoring`, {
    env,
    config,
    // Para MVP:
    // ec2Instance: mainStack.mvpCompute?.instance,
    // Para Advanced:
    // ecsCluster: mainStack.advancedCompute?.cluster,
    // alb: mainStack.advancedCompute?.alb,
});
*/

app.synth();
