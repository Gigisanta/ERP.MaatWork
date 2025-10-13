/**
 * Loader para proyectar datos de Comisiones a dim_advisor y fact_commission
 * Implementa STORY 3 - KAN-124
 */

import { db, dimAdvisor, dimClient, factCommission, mapAsesorVariantes } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import type { ComisionesValidRow } from '../parsers/comisiones';
import type { ProyeccionResult } from '../types';
import { createHash } from 'crypto';

/**
 * Configuración para el proceso de carga de comisiones
 */
export interface ComisionesLoaderConfig {
  runId?: string; // ID del run de integración (opcional)
  upsertAdvisors?: boolean; // Si true, hace upsert de asesores
}

/**
 * Genera un ID único para una operación de comisión
 * Formato: {fecha}_{comitente}_{ticker}_{hash}
 * 
 * @param row - Fila validada
 * @returns op_id único
 */
function generateOpId(row: ComisionesValidRow): string {
  const fechaStr = row.fechaConcertacion.toISOString().split('T')[0];
  const ticker = row.ticker || 'NO_TICKER';
  
  // Hash de campos para unicidad
  const hash = createHash('md5')
    .update(`${fechaStr}_${row.comitente}_${row.cuotapartista}_${ticker}_${row.tipo}_${row.cantidad}`)
    .digest('hex')
    .substring(0, 8);
  
  return `${fechaStr}_${row.comitente}_${ticker}_${hash}`;
}

/**
 * Proyecta o actualiza un asesor en dim_advisor
 * Source of truth: idPersonaAsesor desde comisiones
 * 
 * @param row - Fila validada
 * @returns ID del asesor (existente o nuevo), o null si no se puede determinar
 */
export async function upsertDimAdvisor(row: ComisionesValidRow): Promise<string | null> {
  // Si no hay idPersonaAsesor, no podemos crear/actualizar dim_advisor
  if (row.idPersonaAsesor === null) {
    return null;
  }
  
  // Buscar asesor existente por idPersonaAsesor
  const existing = await db()
    .select()
    .from(dimAdvisor)
    .where(eq(dimAdvisor.idPersonaAsesor, row.idPersonaAsesor))
    .limit(1);
  
  if (existing.length > 0) {
    // Actualizar asesor existente
    const [updated] = await db()
      .update(dimAdvisor)
      .set({
        asesorNorm: row.asesorNorm,
        cuilAsesor: row.cuilAsesor,
        equipo: row.equipo,
        unidad: row.unidadDeNegocio,
        arancel: row.arancel,
        esquemaComisiones: row.esquemaComisiones,
        referidor: row.referidor,
        updatedAt: new Date()
      })
      .where(eq(dimAdvisor.id, existing[0].id))
      .returning({ id: dimAdvisor.id });
    
    return updated.id;
  } else {
    // Insertar nuevo asesor
    const [inserted] = await db()
      .insert(dimAdvisor)
      .values({
        idPersonaAsesor: row.idPersonaAsesor,
        asesorNorm: row.asesorNorm,
        cuilAsesor: row.cuilAsesor,
        equipo: row.equipo,
        unidad: row.unidadDeNegocio,
        arancel: row.arancel,
        esquemaComisiones: row.esquemaComisiones,
        referidor: row.referidor
      })
      .returning({ id: dimAdvisor.id });
    
    return inserted.id;
  }
}

/**
 * Registra la variante de nombre de asesor en map_asesor_variantes
 * 
 * @param raw - Nombre raw del asesor
 * @param norm - Nombre normalizado
 * @param advisorId - ID del asesor en dim_advisor
 */
export async function registerAsesorVariante(
  raw: string | null,
  norm: string,
  advisorId: string | null
): Promise<void> {
  if (!raw || raw === norm) return;
  
  // Verificar si ya existe
  const existing = await db()
    .select()
    .from(mapAsesorVariantes)
    .where(eq(mapAsesorVariantes.asesorRaw, raw))
    .limit(1);
  
  if (existing.length === 0) {
    await db().insert(mapAsesorVariantes).values({
      asesorRaw: raw,
      asesorNorm: norm,
      idAdvisor: advisorId,
      confidence: '1.000' // String representando numeric(4,3)
    });
  } else if (advisorId && existing[0].idAdvisor !== advisorId) {
    // Actualizar si cambió el advisor
    await db()
      .update(mapAsesorVariantes)
      .set({
        idAdvisor: advisorId,
        updatedAt: new Date()
      })
      .where(eq(mapAsesorVariantes.id, existing[0].id));
  }
}

/**
 * Busca el cliente en dim_client por comitente/cuotapartista
 * Retorna null si no existe (será resuelto en STORY 4 matching)
 * 
 * @param comitente - ID comitente
 * @param cuotapartista - ID cuotapartista
 * @returns ID del cliente o null
 */
export async function findClientId(
  comitente: number,
  cuotapartista: number
): Promise<string | null> {
  const existing = await db()
    .select()
    .from(dimClient)
    .where(
      and(
        eq(dimClient.comitente, comitente),
        eq(dimClient.cuotapartista, cuotapartista)
      )
    )
    .limit(1);
  
  return existing.length > 0 ? existing[0].id : null;
}

/**
 * Inserta una comisión en fact_commission
 * 
 * @param row - Fila validada
 * @param clientId - ID del cliente (puede ser null si no matched aún)
 * @param advisorId - ID del asesor beneficiario
 * @returns true si se insertó, false si se omitió por falta de clientId
 */
export async function insertFactCommission(
  row: ComisionesValidRow,
  clientId: string | null,
  advisorId: string | null
): Promise<boolean> {
  // Si no hay clientId, skip (será procesado en matching posterior)
  if (!clientId) {
    return false;
  }
  
  const opId = generateOpId(row);
  const fechaStr = row.fechaConcertacion.toISOString().split('T')[0];
  
  // Calcular comision_usd_alloc con split aplicado
  const comisionUsdAlloc = (row.comisionDolarizada * row.porcentaje) / 100;
  
  // Verificar si ya existe (idempotencia)
  const existing = await db()
    .select()
    .from(factCommission)
    .where(eq(factCommission.opId, opId))
    .limit(1);
  
  if (existing.length > 0) {
    // Actualizar existente
    await db()
      .update(factCommission)
      .set({
        idClient: clientId,
        idAdvisorBenef: advisorId || undefined,
        ticker: row.ticker || undefined,
        tipo: row.tipo || undefined,
        cantidad: row.cantidad?.toString(),
        precio: row.precio?.toString(),
        comisionUsd: row.comisionDolarizada.toString(),
        comisionUsdAlloc: comisionUsdAlloc.toString(),
        ivaArs: row.ivaComision?.toString(),
        porcentajeAlloc: row.porcentaje.toString(),
        equipo: row.equipo || undefined,
        unidad: row.unidadDeNegocio || undefined,
        ownerVsBenefMismatch: false // Se actualizará en STORY 4
      })
      .where(eq(factCommission.id, existing[0].id));
  } else {
    // Insertar nuevo
    await db().insert(factCommission).values({
      opId,
      fecha: fechaStr,
      idClient: clientId,
      idAdvisorBenef: advisorId || undefined,
      ticker: row.ticker || undefined,
      tipo: row.tipo || undefined,
      cantidad: row.cantidad?.toString(),
      precio: row.precio?.toString(),
      comisionUsd: row.comisionDolarizada.toString(),
      comisionUsdAlloc: comisionUsdAlloc.toString(),
      ivaArs: row.ivaComision?.toString(),
      porcentajeAlloc: row.porcentaje.toString(),
      equipo: row.equipo || undefined,
      unidad: row.unidadDeNegocio || undefined,
      ownerVsBenefMismatch: false
    });
  }
  
  return true;
}

/**
 * Carga un batch de filas validadas de comisiones a la base de datos
 * Proyecta a dim_advisor y fact_commission
 * 
 * @param validRows - Filas validadas del parser
 * @param config - Configuración del loader
 * @returns Resultado de la proyección con métricas
 */
export async function loadComisiones(
  validRows: ComisionesValidRow[],
  config: ComisionesLoaderConfig
): Promise<ProyeccionResult & { asesoresCreados: number; asesoresActualizados: number; comisionesCreadas: number }> {
  let asesoresCreados = 0;
  let asesoresActualizados = 0;
  let comisionesCreadas = 0;
  const errors: string[] = [];
  
  // Tracking de asesores para evitar duplicados en el batch
  const processedAdvisors = new Map<number, string>();
  
  for (const row of validRows) {
    try {
      // 1. Upsert asesor si hay idPersonaAsesor
      let advisorId: string | null = null;
      if (row.idPersonaAsesor !== null) {
        if (processedAdvisors.has(row.idPersonaAsesor)) {
          advisorId = processedAdvisors.get(row.idPersonaAsesor)!;
        } else {
          // Verificar si ya existe
          const existingAdvisor = await db()
            .select()
            .from(dimAdvisor)
            .where(eq(dimAdvisor.idPersonaAsesor, row.idPersonaAsesor))
            .limit(1);
          
          const isNew = existingAdvisor.length === 0;
          
          advisorId = await upsertDimAdvisor(row);
          
          if (advisorId) {
            processedAdvisors.set(row.idPersonaAsesor, advisorId);
            if (isNew) {
              asesoresCreados++;
            } else {
              asesoresActualizados++;
            }
          }
        }
        
        // Registrar variante de nombre
        await registerAsesorVariante(row.asesor, row.asesorNorm, advisorId);
      }
      
      // 2. Buscar cliente (sin crear si no existe)
      const clientId = await findClientId(row.comitente, row.cuotapartista);
      
      // 3. Insertar comisión
      const inserted = await insertFactCommission(row, clientId, advisorId);
      if (inserted) {
        comisionesCreadas++;
      }
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(
        `Error procesando comisión ${row.fechaConcertacion.toISOString().split('T')[0]}/${row.comitente}/${row.ticker}: ${msg}`
      );
    }
  }
  
  return {
    clientesCreados: 0, // No se crean clientes en STORY 3
    clientesActualizados: 0,
    snapshotsCreados: comisionesCreadas,
    asesoresCreados,
    asesoresActualizados,
    comisionesCreadas,
    errors
  };
}

/**
 * Pipeline completo de ingesta de Comisiones
 * Wrapper que coordina parsing + loading
 * 
 * @param rawRows - Filas raw del Excel
 * @returns Métricas completas del proceso
 */
export async function ingestComisiones(
  rawRows: any[] // ComisionesRawRow[] pero any para flexibilidad
): Promise<{
  parseMetrics: any;
  loadResult: ProyeccionResult & { asesoresCreados: number; asesoresActualizados: number; comisionesCreadas: number };
  success: boolean;
}> {
  // Importar dinámicamente el parser
  const { parseComisiones } = await import('../parsers/comisiones');
  
  // Fase 1: Parsing y validación
  const parseResult = parseComisiones(rawRows);
  
  // Fase 2: Carga a DB
  const loadResult = await loadComisiones(parseResult.validRows, {
    upsertAdvisors: true
  });
  
  // Actualizar métricas
  parseResult.metrics.filasInsertadas = loadResult.comisionesCreadas;
  
  const success =
    parseResult.metrics.filasRechazadas === 0 &&
    loadResult.errors.length === 0;
  
  return {
    parseMetrics: parseResult.metrics,
    loadResult,
    success
  };
}




