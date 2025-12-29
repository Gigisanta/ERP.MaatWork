/**
 * Tipos relacionados con automatizaciones
 */

import type { TimestampedEntity, CreateRequest, UpdateRequest } from './common';

/**
 * Configuración de trigger para automatizaciones
 */
interface TriggerConfig {
  stageName?: string;
  [key: string]: unknown;
}

/**
 * Configuración adicional de automatización
 */
interface AutomationConfigData {
  [key: string]: unknown;
}

/**
 * Configuración de automatización - extiende TimestampedEntity
 */
export interface AutomationConfig extends TimestampedEntity {
  id: string; // Explicitly include id from BaseEntity for TypeScript resolution
  name: string; // Identificador único (ej: "mail_bienvenida")
  displayName: string; // Nombre para mostrar (ej: "Mail de bienvenida")
  triggerType: string; // Tipo de trigger (ej: "pipeline_stage_change")
  triggerConfig: TriggerConfig; // Configuración del trigger (ej: { stageName: "Cliente" })
  enabled: boolean; // Si está habilitada
  config: AutomationConfigData; // Configuración adicional (payload personalizado, etc.)
}

/**
 * Request para crear configuración de automatización
 */
export interface CreateAutomationConfigRequest extends CreateRequest<AutomationConfig> {
  name: string;
  displayName: string;
  triggerType: string;
  triggerConfig: TriggerConfig;
  enabled: boolean;
  config: AutomationConfigData;
}

/**
 * Request para actualizar configuración de automatización
 */
export interface UpdateAutomationConfigRequest extends UpdateRequest<AutomationConfig> {
  displayName?: string;
  triggerType?: string;
  triggerConfig?: TriggerConfig;
  enabled?: boolean;
  config?: AutomationConfigData;
}
