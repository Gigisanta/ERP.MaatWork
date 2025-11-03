/**
 * Pipeline Stages Default Configuration
 * 
 * Definiciones centralizadas de las 7 etapas requeridas del pipeline.
 * Estas etapas deben existir siempre en el sistema para el correcto funcionamiento del CRM.
 * 
 * REGLA CURSOR: Esta configuración es la fuente de verdad única para las etapas por defecto.
 */

import { db, pipelineStages } from '@cactus/db';
import { eq } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'pipeline-stages-utils' });

/**
 * Definición de una etapa del pipeline por defecto
 */
export interface DefaultPipelineStage {
  name: string;
  description: string;
  order: number;
  color: string;
  wipLimit: number | null;
}

/**
 * Etapas por defecto del pipeline - Fuente de verdad única
 * 
 * Estas 7 etapas son requeridas para el funcionamiento del CRM y deben
 * existir siempre en la base de datos.
 */
export const DEFAULT_PIPELINE_STAGES: readonly DefaultPipelineStage[] = [
  {
    name: 'Prospecto',
    description: 'Contacto inicial identificado',
    order: 1,
    color: '#3b82f6', // Azul
    wipLimit: null
  },
  {
    name: 'Contactado',
    description: 'Primer contacto realizado',
    order: 2,
    color: '#8b5cf6', // Morado
    wipLimit: null
  },
  {
    name: 'Primera reunion',
    description: 'Primera reunión agendada o realizada',
    order: 3,
    color: '#f59e0b', // Amarillo/Naranja
    wipLimit: null
  },
  {
    name: 'Segunda reunion',
    description: 'Segunda reunión agendada o realizada',
    order: 4,
    color: '#f97316', // Naranja
    wipLimit: null
  },
  {
    name: 'Cliente',
    description: 'Cliente activo',
    order: 5,
    color: '#10b981', // Verde
    wipLimit: null
  },
  {
    name: 'Cuenta vacia',
    description: 'Cliente sin saldo',
    order: 6,
    color: '#6b7280', // Gris
    wipLimit: null
  },
  {
    name: 'Caido',
    description: 'Cliente perdido o inactivo',
    order: 7,
    color: '#ef4444', // Rojo
    wipLimit: null
  }
] as const;

/**
 * Garantiza que las etapas por defecto del pipeline existan en la base de datos.
 * 
 * Esta función es idempotente y puede ejecutarse múltiples veces sin problemas.
 * Si una etapa ya existe, se actualiza para asegurar que tenga los valores correctos.
 * Si no existe, se crea.
 * 
 * @param silent - Si es true, no registra logs (útil para fallbacks silenciosos)
 * @returns Promise<void>
 * 
 * AI_DECISION: Función helper para garantizar disponibilidad de etapas por defecto
 * Justificación: Evita hardcoding y proporciona fallback automático si las etapas no existen
 * Impacto: Endpoints del pipeline siempre funcionan, incluso si el seed inicial falló
 */
export async function ensureDefaultPipelineStages(silent = false): Promise<void> {
  const dbInstance = db();
  
  for (const stage of DEFAULT_PIPELINE_STAGES) {
    try {
      // Verificar si la etapa existe por nombre
      const existing = await dbInstance
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.name, stage.name))
        .limit(1);

      if (existing.length > 0) {
        // Actualizar etapa existente para asegurar valores correctos
        await dbInstance
          .update(pipelineStages)
          .set({
            description: stage.description,
            order: stage.order,
            color: stage.color,
            wipLimit: stage.wipLimit,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(pipelineStages.id, existing[0].id));

        if (!silent) {
          logger.debug({ stageName: stage.name }, 'Updated pipeline stage');
        }
      } else {
        // Crear nueva etapa
        await dbInstance
          .insert(pipelineStages)
          .values({
            name: stage.name,
            description: stage.description,
            order: stage.order,
            color: stage.color,
            wipLimit: stage.wipLimit,
            isActive: true
          });

        if (!silent) {
          logger.info({ stageName: stage.name }, 'Created default pipeline stage');
        }
      }
    } catch (error) {
      logger.error({ err: error, stageName: stage.name }, 'Error ensuring pipeline stage');
      // No lanzar error para evitar romper el flujo, pero loguear el problema
      // En producción, esto permitirá que el sistema continúe funcionando
    }
  }

  if (!silent) {
    logger.info({ stageCount: DEFAULT_PIPELINE_STAGES.length }, 'Default pipeline stages ensured');
  }
}



