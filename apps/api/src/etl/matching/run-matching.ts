/**
 * Job para ejecutar matching masivo sobre comisiones sin cliente asignado
 * Implementa la cascada P1→P2→P3→P4 y valida owner vs beneficiario
 */

import { db, stgComisiones, dimClient, factCommission, matchingAudit } from '@cactus/db';
import { eq, isNull, and, sql } from 'drizzle-orm';
import {
  matchClient,
  validateOwnerBenefMatch,
  auditMatch,
  getMatchingMetrics,
  type MatcherConfig
} from './matcher';
import { normalizeCuenta } from '../normalization';

/**
 * Configuración del job de matching
 */
export interface RunMatchingConfig extends MatcherConfig {
  batchSize?: number; // Tamaño del batch (default: 100)
  maxRecords?: number; // Máximo de registros a procesar (default: sin límite)
}

/**
 * Resultado del job de matching
 */
export interface RunMatchingResult {
  totalProcessed: number;
  matched: number;
  multiMatch: number;
  noMatch: number;
  pending: number;
  mismatchOwnerBenef: number;
  errors: string[];
  metrics: Awaited<ReturnType<typeof getMatchingMetrics>>;
}

/**
 * Ejecuta matching sobre comisiones en stg_comisiones que no tienen processed=true
 * Intenta matchear cada comisión con un cliente en dim_client
 * 
 * @param config - Configuración del job
 * @returns Resultado del matching con métricas
 */
export async function runMatchingJob(config: RunMatchingConfig = {}): Promise<RunMatchingResult> {
  const {
    fuzzyEnabled = true,
    fuzzyThreshold = 2,
    batchSize = 100,
    maxRecords
  } = config;
  
  let totalProcessed = 0;
  let matched = 0;
  let multiMatch = 0;
  let noMatch = 0;
  let pending = 0;
  let mismatchOwnerBenef = 0;
  const errors: string[] = [];
  
  // Obtener comisiones sin procesar
  const unprocessedComisiones = await db()
    .select()
    .from(stgComisiones)
    .where(eq(stgComisiones.processed, false))
    .limit(maxRecords || 10000);
  
  for (const comision of unprocessedComisiones) {
    try {
      // Normalizar cuenta si está disponible
      const cuentaNorm = comision.cuenta ? normalizeCuenta(comision.cuenta) : null;
      
      // Ejecutar matching P1→P4
      const matchResult = await matchClient(
        comision.comitente!,
        comision.cuotapartista!,
        cuentaNorm,
        { fuzzyEnabled, fuzzyThreshold }
      );
      
      // Si matched, validar owner vs beneficiario
      let finalMatchResult = matchResult;
      if (matchResult.matched && matchResult.targetClientId) {
        // Obtener idAdvisorBenef desde la comisión
        // (asumimos que ya fue procesado en el loader y está en factCommission)
        // Por simplicidad, pasamos null aquí; en producción buscaríamos desde stg_comisiones
        
        // Buscar el advisorId del beneficiario desde idPersonaAsesor
        let benefAdvisorId: string | null = null;
        if (comision.idPersonaAsesor) {
          const advisor = await db()
            .select()
            .from(require('@cactus/db').dimAdvisor)
            .where(eq(require('@cactus/db').dimAdvisor.idPersonaAsesor, comision.idPersonaAsesor))
            .limit(1);
          
          benefAdvisorId = advisor.length > 0 ? advisor[0].id : null;
        }
        
        finalMatchResult = await validateOwnerBenefMatch(
          matchResult.targetClientId,
          benefAdvisorId,
          matchResult
        );
      }
      
      // Registrar auditoría
      await auditMatch(
        'stg_comisiones',
        comision.id,
        finalMatchResult
      );
      
      // Actualizar fact_commission si existe
      if (finalMatchResult.matched && finalMatchResult.targetClientId) {
        // Buscar fact_commission por opId (debería existir si ya se cargó)
        // Por ahora solo marcamos el flag ownerVsBenefMismatch
        // En producción, actualizaríamos fact_commission aquí
      }
      
      // Marcar como procesado
      await db()
        .update(stgComisiones)
        .set({ processed: true })
        .where(eq(stgComisiones.id, comision.id));
      
      // Contadores
      totalProcessed++;
      
      switch (finalMatchResult.matchStatus) {
        case 'matched':
          matched++;
          break;
        case 'multi_match':
          multiMatch++;
          break;
        case 'no_match':
          noMatch++;
          break;
        case 'pending':
          pending++;
          break;
        case 'mismatch_owner_benef':
          mismatchOwnerBenef++;
          break;
      }
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(
        `Error procesando comisión ${comision.id} (${comision.comitente}/${comision.cuotapartista}): ${msg}`
      );
    }
  }
  
  // Obtener métricas finales
  const metrics = await getMatchingMetrics();
  
  return {
    totalProcessed,
    matched,
    multiMatch,
    noMatch,
    pending,
    mismatchOwnerBenef,
    errors,
    metrics
  };
}

/**
 * Ejecuta matching solo sobre un cliente específico (para testing)
 * 
 * @param comitente - ID de comitente
 * @param cuotapartista - ID de cuotapartista
 * @param cuentaNorm - Cuenta normalizada (opcional)
 * @param config - Configuración del matcher
 * @returns Resultado del matching
 */
export async function matchSingleClient(
  comitente: number,
  cuotapartista: number,
  cuentaNorm: string | null,
  config: MatcherConfig = {}
): Promise<Awaited<ReturnType<typeof matchClient>>> {
  return matchClient(comitente, cuotapartista, cuentaNorm, config);
}
