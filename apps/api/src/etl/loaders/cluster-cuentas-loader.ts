/**
 * Loader para proyectar datos de Cluster Cuentas a dim_client y fact_aum_snapshot
 * Implementa STORY 2 - KAN-123
 */

import { db, dimClient, factAumSnapshot, mapCuentaVariantes } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import type { ClusterCuentasValidRow } from '../parsers/cluster-cuentas';
import type { ProyeccionResult } from '../types';

/**
 * Configuración para el proceso de carga
 */
export interface LoaderConfig {
  snapshotDate: Date; // Fecha parametrizable para el snapshot de AUM
  runId?: string; // ID del run de integración (opcional)
  upsertClients?: boolean; // Si true, hace upsert; si false, solo inserta nuevos
}

/**
 * Proyecta una fila validada a dim_client
 * Hace UPSERT basado en (comitente, cuotapartista)
 * 
 * PRIORIDAD MADRE: Si el cliente fue descubierto en Madre, el Mensual solo actualiza
 * campos no-autoritativos (equipo/unidad). El owner viene de la Madre.
 * 
 * @param row - Fila validada
 * @returns ID del cliente (existente o nuevo)
 */
export async function upsertDimClient(row: ClusterCuentasValidRow): Promise<string> {
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
    // Cliente ya existe
    const client = existing[0];
    
    // Si fue descubierto en Madre, solo actualizar campos no-autoritativos
    if (client.descubiertoEnMadre) {
      const [updated] = await db()
        .update(dimClient)
        .set({
          // Solo actualizar equipo/unidad (no cuenta, no AUM, no owner)
          equipo: row.equipo,
          unidad: row.unidad,
          // Marcar que también pasó por Mensual
          descubiertoEnMensual: true,
          updatedAt: new Date()
        })
        .where(eq(dimClient.id, client.id))
        .returning({ id: dimClient.id });
      
      return updated.id;
    } else {
      // No está en Madre: Mensual puede actualizar todos los campos
      const [updated] = await db()
        .update(dimClient)
        .set({
          cuentaNorm: row.cuentaNorm,
          idcuenta: row.idcuenta,
          esJuridica: row.esJuridica,
          fechaAlta: row.fechaAlta ? row.fechaAlta.toISOString().split('T')[0] : null,
          activo: row.activo,
          primerFondeo: row.primerFondeo ? row.primerFondeo.toISOString().split('T')[0] : null,
          equipo: row.equipo,
          unidad: row.unidad,
          descubiertoEnMensual: true,
          updatedAt: new Date()
        })
        .where(eq(dimClient.id, client.id))
        .returning({ id: dimClient.id });
      
      return updated.id;
    }
  } else {
    // Insertar nuevo cliente descubierto por Mensual
    const [inserted] = await db()
      .insert(dimClient)
      .values({
        comitente: row.comitente,
        cuotapartista: row.cuotapartista,
        cuentaNorm: row.cuentaNorm,
        idcuenta: row.idcuenta,
        esJuridica: row.esJuridica,
        fechaAlta: row.fechaAlta ? row.fechaAlta.toISOString().split('T')[0] : null,
        activo: row.activo,
        primerFondeo: row.primerFondeo ? row.primerFondeo.toISOString().split('T')[0] : null,
        equipo: row.equipo,
        unidad: row.unidad,
        descubiertoEnMadre: false,
        descubiertoEnMensual: true
      })
      .returning({ id: dimClient.id });
    
    return inserted.id;
  }
}

/**
 * Registra la normalización de cuenta en map_cuenta_variantes
 * Solo si es diferente de la raw
 * 
 * @param raw - Cuenta raw
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
      heuristica: 'UPPER + sin tildes + trim + collapse spaces + quitar puntuación'
    });
  }
}

/**
 * Inserta un snapshot de AUM en fact_aum_snapshot
 * Hace UPSERT basado en (snapshot_date, id_client)
 * 
 * PRIORIDAD MADRE: Si ya existe un snapshot para esta fecha+cliente Y tiene
 * idAdvisorOwner (vino de Madre), NO sobrescribir. El Mensual solo rellena faltantes.
 * 
 * @param row - Fila validada
 * @param clientId - ID del cliente en dim_client
 * @param snapshotDate - Fecha del snapshot
 */
export async function upsertFactAumSnapshot(
  row: ClusterCuentasValidRow,
  clientId: string,
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
  
  // Si ya existe Y tiene owner (vino de Madre), NO sobrescribir
  if (existing.length > 0 && existing[0].idAdvisorOwner !== null) {
    // La Madre ya registró este snapshot; Mensual no lo toca
    return;
  }
  
  const aumData = {
    snapshotDate: dateStr,
    idClient: clientId,
    idAdvisorOwner: null, // Mensual no conoce el owner; solo la Madre lo define
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
    // Actualizar snapshot existente (solo si NO tenía owner)
    await db()
      .update(factAumSnapshot)
      .set(aumData)
      .where(eq(factAumSnapshot.id, existing[0].id));
  } else {
    // Insertar nuevo snapshot (descubierto por Mensual)
    await db().insert(factAumSnapshot).values(aumData);
  }
}

/**
 * Carga un batch de filas validadas a la base de datos
 * Proyecta a dim_client y fact_aum_snapshot
 * 
 * @param validRows - Filas validadas del parser
 * @param config - Configuración del loader
 * @returns Resultado de la proyección con métricas
 */
export async function loadClusterCuentas(
  validRows: ClusterCuentasValidRow[],
  config: LoaderConfig
): Promise<ProyeccionResult> {
  let clientesCreados = 0;
  let clientesActualizados = 0;
  let snapshotsCreados = 0;
  const errors: string[] = [];
  
  for (const row of validRows) {
    try {
      // Buscar si el cliente ya existe
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
      
      // Upsert cliente
      const clientId = await upsertDimClient(row);
      
      if (isNew) {
        clientesCreados++;
      } else {
        clientesActualizados++;
      }
      
      // Registrar normalización de cuenta si aplica
      await registerCuentaNormalization(row.cuenta, row.cuentaNorm);
      
      // Insertar/actualizar snapshot de AUM
      await upsertFactAumSnapshot(row, clientId, config.snapshotDate);
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
 * Pipeline completo de ingesta de Cluster Cuentas
 * Wrapper que coordina parsing + loading
 * 
 * @param rawRows - Filas raw del Excel
 * @param snapshotDate - Fecha del snapshot de AUM
 * @returns Métricas completas del proceso
 */
export async function ingestClusterCuentas(
  rawRows: any[], // ClusterCuentasRawRow[] pero any para flexibilidad
  snapshotDate: Date
): Promise<{
  parseMetrics: any;
  loadResult: ProyeccionResult;
  success: boolean;
}> {
  // Importar dinámicamente el parser para evitar dependencias circulares
  const { parseClusterCuentas } = await import('../parsers/cluster-cuentas');
  
  // Fase 1: Parsing y validación
  const parseResult = parseClusterCuentas(rawRows);
  
  // Fase 2: Carga a DB
  const loadResult = await loadClusterCuentas(parseResult.validRows, {
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




