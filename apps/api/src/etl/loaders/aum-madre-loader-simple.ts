
/**
 * Loader simplificado para AUM Madre sin columnas problemáticas
 */

import { db, dimClient, dimAdvisor, factAumSnapshot } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import type { AumMadreValidRow } from '../parsers/aum-madre';
import type { ProyeccionResult } from '../types';

/**
 * Busca o crea un asesor por nombre
 */
export async function findOrCreateAdvisorByName(
  asesorNorm: string,
  equipo: string,
  unidad: string
): Promise<string | null> {
  try {
    // Buscar asesor existente
    const existing = await db()
      .select({ id: dimAdvisor.id })
      .from(dimAdvisor)
      .where(eq(dimAdvisor.asesorNorm, asesorNorm))
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Crear nuevo asesor
    const [inserted] = await db()
      .insert(dimAdvisor)
      .values({
        asesorNorm,
        equipo,
        unidad
      })
      .returning({ id: dimAdvisor.id });

    return inserted.id;
  } catch (error) {
    console.error('Error creando/buscando asesor:', error);
    return null;
  }
}

/**
 * Crea o actualiza un cliente en dim_client
 */
export async function upsertDimClientFromMadre(row: AumMadreValidRow): Promise<string> {
  // Buscar cliente existente
  const existing = await db()
    .select({ id: dimClient.id })
    .from(dimClient)
    .where(
      and(
        eq(dimClient.comitente, row.comitente),
        eq(dimClient.cuotapartista, row.cuotapartista)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Actualizar cliente existente
    const [updated] = await db()
      .update(dimClient)
      .set({
        cuentaNorm: row.descripcionNorm,
        equipo: row.equipo,
        unidad: row.unidad,
        updatedAt: new Date()
      })
      .where(eq(dimClient.id, existing[0].id))
      .returning({ id: dimClient.id });
    
    return updated.id;
  } else {
    // Crear nuevo cliente
    const [inserted] = await db()
      .insert(dimClient)
      .values({
        comitente: row.comitente,
        cuotapartista: row.cuotapartista,
        cuentaNorm: row.descripcionNorm,
        equipo: row.equipo,
        unidad: row.unidad
      })
      .returning({ id: dimClient.id });
    
    return inserted.id;
  }
}

/**
 * Crea snapshot de AUM
 */
export async function createAumSnapshot(
  clientId: string,
  advisorId: string | null,
  row: AumMadreValidRow,
  snapshotDate: Date
): Promise<string> {
  const [inserted] = await db()
    .insert(factAumSnapshot)
    .values({
      snapshotDate: snapshotDate.toISOString().split('T')[0],
      idClient: clientId,
      idAdvisorOwner: advisorId,
      aumUsd: row.aumEnDolares.toString(),
      bolsaArg: row.bolsaArg?.toString() || '0',
      fondosArg: row.fondosArg?.toString() || '0',
      bolsaBci: row.bolsaBci?.toString() || '0',
      pesos: row.pesos?.toString() || '0',
      mep: row.mep?.toString() || '0',
      cable: row.cable?.toString() || '0',
      cv7000: row.cv7000?.toString() || '0',
      cv10000: row.cv10000?.toString() || '0'
    })
    .returning({ id: factAumSnapshot.id });

  return inserted.id;
}

/**
 * Carga datos del archivo Madre
 */
export async function loadAumMadre(
  validRows: AumMadreValidRow[],
  snapshotDate: Date
): Promise<ProyeccionResult> {
  const result: ProyeccionResult = {
    clientesCreados: 0,
    clientesActualizados: 0,
    snapshotsCreados: 0,
    errors: []
  };

  for (const row of validRows) {
    try {
      // Crear/buscar asesor
      const advisorId = await findOrCreateAdvisorByName(
        row.asesorNorm,
        row.equipo || '',
        row.unidad || ''
      );

      // Crear/actualizar cliente
      const clientId = await upsertDimClientFromMadre(row);

      // Crear snapshot
      await createAumSnapshot(clientId, advisorId, row, snapshotDate);

      result.snapshotsCreados++;
      // Nota: Para simplificar, asumimos que siempre se crea/actualiza un cliente

    } catch (error) {
      const errorMsg = `Error procesando comitente ${row.comitente}/${row.cuotapartista}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      console.error(errorMsg, error);
    }
  }

  return result;
}

/**
 * Función principal de ingesta
 */
export async function ingestAumMadre(
  rawRows: any[],
  snapshotDate: Date
): Promise<{
  parseMetrics: any;
  loadResult: ProyeccionResult;
  success: boolean;
}> {
  // Importar dinámicamente el parser
  const { parseAumMadre } = await import('../parsers/aum-madre');
  
  // Fase 1: Parsing y validación
  const parseResult = await parseAumMadre(rawRows);
  
  // Fase 2: Carga a DB
  const loadResult = await loadAumMadre(parseResult.validRows, snapshotDate);
  
  // Actualizar métricas
  parseResult.metrics.filasInsertadas = loadResult.snapshotsCreados;
  
  const success = 
    parseResult.metrics.filasRechazadas === 0 &&
    loadResult.errors.length === 0;
  
  return {
    parseMetrics: parseResult.metrics,
    loadResult,
    success
  };
}
