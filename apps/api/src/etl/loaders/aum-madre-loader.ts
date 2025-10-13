/**
 * Loader para proyectar datos del CSV Madre a dim_client y fact_aum_snapshot
 * FUENTE AUTORITATIVA: prioridad sobre el Mensual para AUM y owner
 */

import { db, dimClient, dimAdvisor, factAumSnapshot, mapCuentaVariantes } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import type { AumMadreValidRow } from '../parsers/aum-madre';
import type { ProyeccionResult } from '../types';

/**
 * Configuración para el proceso de carga del CSV Madre
 */
export interface AumMadreLoaderConfig {
  snapshotDate: Date; // Fecha del snapshot de AUM (parametrizable)
  runId?: string; // ID del run de integración (opcional)
  upsertClients?: boolean; // Si true, hace upsert; si false, solo inserta nuevos
}

/**
 * Busca o crea un asesor en dim_advisor por nombre normalizado
 * (usado cuando CSV madre solo tiene nombre de asesor, no idPersonaAsesor)
 * 
 * @param asesorNorm - Nombre normalizado del asesor
 * @param equipo - Equipo del asesor
 * @param unidad - Unidad del asesor
 * @returns ID del asesor o null si no se pudo crear/encontrar
 */
export async function findOrCreateAdvisorByName(
  asesorNorm: string,
  equipo: string | null,
  unidad: string | null
): Promise<string | null> {
  if (!asesorNorm || asesorNorm === '') return null;
  
  // Buscar asesor existente por nombre normalizado
  const existing = await db()
    .select()
    .from(dimAdvisor)
    .where(eq(dimAdvisor.asesorNorm, asesorNorm))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  // Insertar nuevo asesor (sin idPersonaAsesor)
  const [inserted] = await db()
    .insert(dimAdvisor)
    .values({
      idPersonaAsesor: null, // No disponible desde CSV madre
      asesorNorm,
      cuilAsesor: null,
      equipo,
      unidad,
      arancel: null,
      esquemaComisiones: null,
      referidor: null
    })
    .returning({ id: dimAdvisor.id });
  
  return inserted.id;
}

/**
 * Proyecta una fila validada del CSV Madre a dim_client
 * Hace UPSERT basado en (comitente, cuotapartista)
 * PRIORIDAD: Si el cliente YA existe, solo actualiza si vino desde madre (// descubiertoEnMadre=true)
 * 
 * @param row - Fila validada del CSV Madre
 * @param idAdvisorOwner - ID del asesor owner (si se encontró)
 * @returns ID del cliente (existente o nuevo)
 */
export async function upsertDimClientFromMadre(
  row: AumMadreValidRow,
  idAdvisorOwner: string | null
): Promise<string> {
  // Buscar cliente existente
  const existing = await db()
    .select()
    .from(dimClient)
    .where(
      and(
        eq(dimClient.comitente, row.comitente),
        eq(dimClient.cuotapartista, row.cuotapartista)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // Cliente ya existe: actualizar SIEMPRE (Madre tiene prioridad)
    const [updated] = await db()
      .update(dimClient)
      .set({
        cuentaNorm: row.descripcionNorm,
        idcuenta: row.idCuenta,
        esJuridica: row.esJuridica,
        fechaAlta: row.fechaAlta ? row.fechaAlta.toISOString().split('T')[0] : null,
        activo: row.activo,
        primerFondeo: row.primerFondeo ? row.primerFondeo.toISOString().split('T')[0] : null,
        equipo: row.equipo,
        unidad: row.unidad,
        descubiertoEnMadre: true, // Marcar como descubierto en madre
        updatedAt: new Date()
      })
      .where(eq(dimClient.id, existing[0].id))
      .returning({ id: dimClient.id });
    
    return updated.id;
  } else {
    // Insertar nuevo cliente desde Madre
    const [inserted] = await db()
      .insert(dimClient)
      .values({
        comitente: row.comitente,
        cuotapartista: row.cuotapartista,
        cuentaNorm: row.descripcionNorm,
        idcuenta: row.idCuenta,
        esJuridica: row.esJuridica,
        fechaAlta: row.fechaAlta ? row.fechaAlta.toISOString().split('T')[0] : null,
        activo: row.activo,
        primerFondeo: row.primerFondeo ? row.primerFondeo.toISOString().split('T')[0] : null,
        equipo: row.equipo,
        unidad: row.unidad,
        descubiertoEnMadre: true,
        descubiertoEnMensual: false
      })
      .returning({ id: dimClient.id });
    
    return inserted.id;
  }
}

/**
 * Registra la normalización de cuenta en map_cuenta_variantes
 * Solo si es diferente de la raw
 * 
 * @param raw - Cuenta raw (Descripcion)
 * @param norm - Cuenta normalizada
 */
export async function registerCuentaNormalization(
  raw: string | null,
  norm: string
): Promise<void> {
  if (!raw || raw === norm) return;
  
  // Verificar si ya existe
  const existing = await db()
    .select()
    .from(mapCuentaVariantes)
    .where(eq(mapCuentaVariantes.cuentaRaw, raw))
    .limit(1);
  
  if (existing.length === 0) {
    await db().insert(mapCuentaVariantes).values({
      cuentaRaw: raw,
      cuentaNorm: norm,
      heuristica: 'CSV Madre: UPPER + sin tildes + trim + collapse spaces + quitar puntuación'
    });
  }
}

/**
 * Inserta/actualiza un snapshot de AUM en fact_aum_snapshot
 * Hace UPSERT basado en (snapshot_date, id_client)
 * PRIORIDAD: Madre sobrescribe valores del Mensual
 * 
 * @param row - Fila validada del CSV Madre
 * @param clientId - ID del cliente en dim_client
 * @param idAdvisorOwner - ID del asesor owner (desde CSV madre)
 * @param snapshotDate - Fecha del snapshot
 */
export async function upsertFactAumSnapshotFromMadre(
  row: AumMadreValidRow,
  clientId: string,
  idAdvisorOwner: string | null,
  snapshotDate: Date
): Promise<void> {
  const dateStr = snapshotDate.toISOString().split('T')[0];
  
  // Verificar si ya existe snapshot para esta fecha y cliente
  const existing = await db()
    .select()
    .from(factAumSnapshot)
    .where(
      and(
        eq(factAumSnapshot.snapshotDate, dateStr),
        eq(factAumSnapshot.idClient, clientId)
      )
    )
    .limit(1);
  
  const aumData = {
    snapshotDate: dateStr,
    idClient: clientId,
    idAdvisorOwner, // Owner desde CSV madre
    aumUsd: row.aumEnDolares.toString(),
    bolsaArg: row.bolsaArg.toString(),
    fondosArg: row.fondosArg.toString(),
    bolsaBci: row.bolsaBci.toString(),
    pesos: row.pesos.toString(),
    mep: row.mep.toString(),
    cable: row.cable.toString(),
    cv7000: row.cv7000.toString(),
    cv10000: row.cv10000.toString()
  };
  
  if (existing.length > 0) {
    // Actualizar snapshot existente (Madre tiene prioridad)
    await db()
      .update(factAumSnapshot)
      .set(aumData)
      .where(eq(factAumSnapshot.id, existing[0].id));
  } else {
    // Insertar nuevo snapshot
    await db().insert(factAumSnapshot).values(aumData);
  }
}

/**
 * Carga un batch de filas validadas del CSV Madre a la base de datos
 * Proyecta a dim_client y fact_aum_snapshot con PRIORIDAD sobre Mensual
 * 
 * @param validRows - Filas validadas del parser
 * @param config - Configuración del loader
 * @returns Resultado de la proyección con métricas
 */
export async function loadAumMadre(
  validRows: AumMadreValidRow[],
  config: AumMadreLoaderConfig
): Promise<ProyeccionResult> {
  let clientesCreados = 0;
  let clientesActualizados = 0;
  let snapshotsCreados = 0;
  const errors: string[] = [];
  
  for (const row of validRows) {
    try {
      // 1. Buscar/crear asesor owner por nombre normalizado
      const idAdvisorOwner = await findOrCreateAdvisorByName(
        row.asesorNorm,
        row.equipo,
        row.unidad
      );
      
      // 2. Buscar si el cliente ya existe
      const existingClient = await db()
        .select()
        .from(dimClient)
        .where(
          and(
            eq(dimClient.comitente, row.comitente),
            eq(dimClient.cuotapartista, row.cuotapartista)
          )
        )
        .limit(1);
      
      const isNew = existingClient.length === 0;
      
      // 3. Upsert cliente con prioridad de Madre
      const clientId = await upsertDimClientFromMadre(row, idAdvisorOwner);
      
      if (isNew) {
        clientesCreados++;
      } else {
        clientesActualizados++;
      }
      
      // 4. Registrar normalización de cuenta si aplica
      await registerCuentaNormalization(row.descripcion, row.descripcionNorm);
      
      // 5. Insertar/actualizar snapshot de AUM con owner desde Madre
      await upsertFactAumSnapshotFromMadre(row, clientId, idAdvisorOwner, config.snapshotDate);
      snapshotsCreados++;
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(
        `Error procesando comitente ${row.comitente}/${row.cuotapartista}: ${msg}`
      );
    }
  }
  
  return {
    clientesCreados,
    clientesActualizados,
    snapshotsCreados,
    errors
  };
}

/**
 * Pipeline completo de ingesta del CSV Madre
 * Wrapper que coordina parsing + loading con prioridad autoritativa
 * 
 * @param rawRows - Filas raw del CSV
 * @param snapshotDate - Fecha del snapshot de AUM
 * @returns Métricas completas del proceso
 */
export async function ingestAumMadre(
  rawRows: any[], // AumMadreRawRow[] pero any para flexibilidad
  snapshotDate: Date
): Promise<{
  parseMetrics: any;
  loadResult: ProyeccionResult;
  success: boolean;
}> {
  // Importar dinámicamente el parser para evitar dependencias circulares
  const { parseAumMadre } = await import('../parsers/aum-madre');
  
  // Fase 1: Parsing y validación
  const parseResult = await parseAumMadre(rawRows);
  
  // Fase 2: Carga a DB con prioridad autoritativa
  const loadResult = await loadAumMadre(parseResult.validRows, {
    snapshotDate,
    upsertClients: true
  });
  
  // Actualizar métricas con resultados de carga
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

