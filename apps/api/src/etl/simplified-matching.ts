/**
 * Sistema de Matching Simplificado
 * Flujo: Madre (autoridad) → Nuevo (actualización) → Comisiones (procesamiento)
 */

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';

export interface SimplifiedMatchingResult {
  success: boolean;
  message: string;
  stats: {
    madresProcessed: number;
    nuevosProcessed: number;
    comisionesProcessed: number;
    clientesActualizados: number;
    comisionesAsignadas: number;
  };
  errors: string[];
}

/**
 * Ejecuta el proceso de matching simplificado
 * 1. Archivo Madre define la autoridad (de quién es cada cliente)
 * 2. Archivo Nuevo actualiza la información del Madre
 * 3. Archivo Madre actualizado se convierte en la nueva autoridad
 * 4. Comisiones se procesan usando la información del Madre actualizado
 */
export async function executeSimplifiedMatching(): Promise<SimplifiedMatchingResult> {
  const errors: string[] = [];
  const stats = {
    madresProcessed: 0,
    nuevosProcessed: 0,
    comisionesProcessed: 0,
    clientesActualizados: 0,
    comisionesAsignadas: 0
  };

  try {
    // Verificar soporte de columnas de flags en dim_client
    const flagColumnCheck = await db().execute(sql`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'dim_client' AND column_name = 'descubierto_en_madre'
      LIMIT 1
    `);
    const hasDescubiertoFlags = flagColumnCheck.length > 0;

    // Paso 1: Verificar que existan datos del archivo Madre
    // Si existen flags, usamos descubierto_en_madre=true; si no, fallback a id_advisor_owner IS NOT NULL
    const madresCount = hasDescubiertoFlags
      ? await db().execute(sql`
          SELECT COUNT(*) as count
          FROM fact_aum_snapshot fas
          JOIN dim_client dc ON dc.id = fas.id_client
          WHERE dc.descubierto_en_madre = true
        `)
      : await db().execute(sql`
          SELECT COUNT(*) as count 
          FROM fact_aum_snapshot 
          WHERE id_advisor_owner IS NOT NULL
        `);

    const madresCountValue = madresCount[0]?.count || 0;
    if (madresCountValue === 0) {
      throw new Error('No se encontraron datos del archivo Madre. Debe cargar el archivo Madre primero.');
    }

    stats.madresProcessed = Number(madresCountValue);

    // Paso 2: Verificar datos del archivo Nuevo
    // Si existen flags, usamos descubierto_en_madre=false; si no, fallback a id_advisor_owner IS NULL
    const nuevosCount = hasDescubiertoFlags
      ? await db().execute(sql`
          SELECT COUNT(*) as count
          FROM fact_aum_snapshot fas
          JOIN dim_client dc ON dc.id = fas.id_client
          WHERE dc.descubierto_en_madre = false
        `)
      : await db().execute(sql`
          SELECT COUNT(*) as count 
          FROM fact_aum_snapshot 
          WHERE id_advisor_owner IS NULL
        `);

    stats.nuevosProcessed = Number(nuevosCount[0]?.count || 0);

    // Paso 3: Actualizar archivo Madre con información del archivo Nuevo
    if (stats.nuevosProcessed > 0) {
      const updateResult = await updateMadreWithNuevoData();
      stats.clientesActualizados = updateResult.updated;
    }

    // Paso 4: Procesar comisiones usando la información del archivo Madre actualizado
    const comisionesResult = await processCommissionsWithMadreAuthority();
    stats.comisionesProcessed = comisionesResult.processed;
    stats.comisionesAsignadas = comisionesResult.assigned;

    return {
      success: true,
      message: `Proceso completado: ${stats.clientesActualizados} clientes actualizados, ${stats.comisionesAsignadas} comisiones asignadas`,
      stats,
      errors
    };

  } catch (error: any) {
    errors.push(error.message);
    return {
      success: false,
      message: 'Error en el proceso de conciliación',
      stats,
      errors
    };
  }
}

/**
 * Actualiza el archivo Madre con información del archivo Nuevo
 * Mantiene la asignación de asesor del Madre pero actualiza otros campos
 */
async function updateMadreWithNuevoData(): Promise<{ updated: number }> {
  
  // Actualizar snapshots del Madre con información del archivo Nuevo
  // pero preservando la asignación de asesor del archivo Madre
  const result = await db().execute(sql`
    UPDATE fact_aum_snapshot 
    SET 
      aum_usd = COALESCE(nuevo.aum_usd, fact_aum_snapshot.aum_usd),
      bolsa_arg = COALESCE(nuevo.bolsa_arg, fact_aum_snapshot.bolsa_arg),
      fondos_arg = COALESCE(nuevo.fondos_arg, fact_aum_snapshot.fondos_arg),
      bolsa_bci = COALESCE(nuevo.bolsa_bci, fact_aum_snapshot.bolsa_bci),
      pesos = COALESCE(nuevo.pesos, fact_aum_snapshot.pesos),
      mep = COALESCE(nuevo.mep, fact_aum_snapshot.mep),
      cable = COALESCE(nuevo.cable, fact_aum_snapshot.cable),
      cv7000 = COALESCE(nuevo.cv7000, fact_aum_snapshot.cv7000),
      cv10000 = COALESCE(nuevo.cv10000, fact_aum_snapshot.cv10000),
      created_at = NOW()
    FROM (
      SELECT DISTINCT
        dc.id as client_id,
        fas.aum_usd,
        fas.bolsa_arg,
        fas.fondos_arg,
        fas.bolsa_bci,
        fas.pesos,
        fas.mep,
        fas.cable,
        fas.cv7000,
        fas.cv10000
      FROM fact_aum_snapshot fas
      JOIN dim_client dc ON fas.id_client = dc.id
      WHERE fas.id_advisor_owner IS NULL  -- Datos del archivo Nuevo
    ) nuevo
    WHERE fact_aum_snapshot.id_client = nuevo.client_id
      AND fact_aum_snapshot.id_advisor_owner IS NOT NULL  -- Solo actualizar datos del Madre
  `);

  return { updated: result.rowCount || 0 };
}

/**
 * Procesa comisiones usando la información del archivo Madre como autoridad
 */
async function processCommissionsWithMadreAuthority(): Promise<{ processed: number; assigned: number }> {

  // Obtener comisiones que no han sido procesadas
  const unprocessedCommissions = await db().execute(sql`
    SELECT id, comitente, cuotapartista, cuenta
    FROM stg_comisiones 
    WHERE processed = false
    LIMIT 1000
  `);

  let processed = 0;
  let assigned = 0;

  for (const commission of unprocessedCommissions) {
    // Buscar cliente en dim_client usando información del archivo Madre
    const client = await db().execute(sql`
      SELECT dc.id, dc.id_advisor_owner
      FROM dim_client dc
      WHERE dc.comitente = ${commission.comitente}
        AND dc.cuotapartista = ${commission.cuotapartista}
      LIMIT 1
    `);

    if (client.length > 0) {
      // Actualizar comisión con el cliente encontrado
      await db().execute(sql`
        UPDATE stg_comisiones 
        SET 
          id_client = ${client[0].id},
          id_advisor_beneficiario = ${client[0].id_advisor_owner},
          processed = true,
          processed_at = NOW()
        WHERE id = ${commission.id}
      `);

      assigned++;
    }

    processed++;
  }

  return { processed, assigned };
}
