/**
 * Motor de matching determinístico Cliente ↔ Comisión ↔ Asesor
 * Implementa STORY 4 - KAN-125 + Superprompt (mismatch_owner_benef)
 */

import { db, dimClient, dimAdvisor, matchingAudit, factAumSnapshot, factCommission } from '@cactus/db';
import { eq, and, or, sql, like, desc } from 'drizzle-orm';
import { levenshteinDistance } from '../normalization';

/**
 * Resultado de un intento de matching
 */
export interface MatchResult {
  matched: boolean;
  matchStatus: 'matched' | 'multi_match' | 'no_match' | 'mismatch_owner_benef' | 'pending';
  matchRule?: 'P1_comitente' | 'P2_cuotapartista' | 'P3_cuenta_norm' | 'P4_fuzzy';
  targetClientId?: string;
  confidence: number; // 0-1
  candidates?: Array<{ id: string; score: number }>;
  context: Record<string, any>;
  ownerAdvisorId?: string | null; // ID del asesor owner desde fact_aum_snapshot
  benefAdvisorId?: string | null; // ID del asesor beneficiario desde comisión
}

/**
 * Configuración del matcher
 */
export interface MatcherConfig {
  fuzzyEnabled?: boolean; // Si false, no usa P4 fuzzy
  fuzzyThreshold?: number; // Levenshtein distance máxima (default: 2)
  minConfidence?: number; // Confidence mínima para match (default: 0.8)
}

/**
 * P1: Match exacto por comitente
 * 
 * @param comitente - ID de comitente
 * @returns Resultado del matching
 */
export async function matchByComitente(comitente: number): Promise<MatchResult> {
  const candidates = await db()
    .select()
    .from(dimClient)
    .where(eq(dimClient.comitente, comitente));
  
  if (candidates.length === 0) {
    return {
      matched: false,
      matchStatus: 'no_match',
      confidence: 0,
      context: { rule: 'P1_comitente', comitente }
    };
  }
  
  if (candidates.length === 1) {
    return {
      matched: true,
      matchStatus: 'matched',
      matchRule: 'P1_comitente',
      targetClientId: candidates[0].id,
      confidence: 1.0,
      context: { rule: 'P1_comitente', comitente, candidatesCount: 1 }
    };
  }
  
  // Múltiples matches
  return {
    matched: false,
    matchStatus: 'multi_match',
    matchRule: 'P1_comitente',
    confidence: 0.7,
    candidates: candidates.map((c: any) => ({ id: c.id, score: 1.0 })),
    context: { rule: 'P1_comitente', comitente, candidatesCount: candidates.length }
  };
}

/**
 * P2: Match exacto por cuotapartista
 * 
 * @param cuotapartista - ID de cuotapartista
 * @returns Resultado del matching
 */
export async function matchByCuotapartista(cuotapartista: number): Promise<MatchResult> {
  const candidates = await db()
    .select()
    .from(dimClient)
    .where(eq(dimClient.cuotapartista, cuotapartista));
  
  if (candidates.length === 0) {
    return {
      matched: false,
      matchStatus: 'no_match',
      confidence: 0,
      context: { rule: 'P2_cuotapartista', cuotapartista }
    };
  }
  
  if (candidates.length === 1) {
    return {
      matched: true,
      matchStatus: 'matched',
      matchRule: 'P2_cuotapartista',
      targetClientId: candidates[0].id,
      confidence: 1.0,
      context: { rule: 'P2_cuotapartista', cuotapartista, candidatesCount: 1 }
    };
  }
  
  return {
    matched: false,
    matchStatus: 'multi_match',
    matchRule: 'P2_cuotapartista',
    confidence: 0.7,
    candidates: candidates.map((c: any) => ({ id: c.id, score: 1.0 })),
    context: { rule: 'P2_cuotapartista', cuotapartista, candidatesCount: candidates.length }
  };
}

/**
 * P3: Match exacto por cuenta_norm
 * 
 * @param cuentaNorm - Cuenta normalizada
 * @returns Resultado del matching
 */
export async function matchByCuentaNorm(cuentaNorm: string): Promise<MatchResult> {
  if (!cuentaNorm || cuentaNorm.trim() === '') {
    return {
      matched: false,
      matchStatus: 'no_match',
      confidence: 0,
      context: { rule: 'P3_cuenta_norm', cuentaNorm: 'empty' }
    };
  }
  
  const candidates = await db()
    .select()
    .from(dimClient)
    .where(eq(dimClient.cuentaNorm, cuentaNorm));
  
  if (candidates.length === 0) {
    return {
      matched: false,
      matchStatus: 'no_match',
      confidence: 0,
      context: { rule: 'P3_cuenta_norm', cuentaNorm }
    };
  }
  
  if (candidates.length === 1) {
    return {
      matched: true,
      matchStatus: 'matched',
      matchRule: 'P3_cuenta_norm',
      targetClientId: candidates[0].id,
      confidence: 0.95,
      context: { rule: 'P3_cuenta_norm', cuentaNorm, candidatesCount: 1 }
    };
  }
  
  return {
    matched: false,
    matchStatus: 'multi_match',
    matchRule: 'P3_cuenta_norm',
    confidence: 0.6,
    candidates: candidates.map((c: any) => ({ id: c.id, score: 0.95 })),
    context: { rule: 'P3_cuenta_norm', cuentaNorm, candidatesCount: candidates.length }
  };
}

/**
 * P4: Match fuzzy por cuenta_norm (Levenshtein ≤ threshold)
 * Retorna PENDING para revisión manual si encuentra candidatos
 * 
 * @param cuentaNorm - Cuenta normalizada
 * @param threshold - Distancia máxima permitida
 * @returns Resultado del matching
 */
export async function matchByCuentaFuzzy(
  cuentaNorm: string,
  threshold: number = 2
): Promise<MatchResult> {
  if (!cuentaNorm || cuentaNorm.trim() === '') {
    return {
      matched: false,
      matchStatus: 'no_match',
      confidence: 0,
      context: { rule: 'P4_fuzzy', cuentaNorm: 'empty' }
    };
  }
  
  // Obtener todos los clientes y calcular distancia
  const allClients = await db()
    .select()
    .from(dimClient)
    .where(sql`${dimClient.cuentaNorm} IS NOT NULL`);
  
  const candidatesWithScore = allClients
    .map((client: any) => ({
      ...client,
      distance: levenshteinDistance(cuentaNorm, client.cuentaNorm || ''),
      score: 0
    }))
    .filter((c: any) => c.distance <= threshold)
    .map((c: any) => ({
      ...c,
      score: 1 - (c.distance / (cuentaNorm.length + 1)) // Normalizar score
    }))
    .sort((a: any, b: any) => a.distance - b.distance);
  
  if (candidatesWithScore.length === 0) {
    return {
      matched: false,
      matchStatus: 'no_match',
      confidence: 0,
      context: { rule: 'P4_fuzzy', cuentaNorm, threshold }
    };
  }
  
  // Fuzzy match siempre retorna PENDING para revisión manual
  return {
    matched: false,
    matchStatus: 'pending',
    matchRule: 'P4_fuzzy',
    confidence: candidatesWithScore[0].score,
    candidates: candidatesWithScore.map((c: any) => ({ id: c.id, score: c.score })),
    context: {
      rule: 'P4_fuzzy',
      cuentaNorm,
      threshold,
      candidatesCount: candidatesWithScore.length,
      bestDistance: candidatesWithScore[0].distance
    }
  };
}

/**
 * Ejecuta la cascada de reglas de matching en orden P1 → P2 → P3 → P4
 * Retorna en el primer match exitoso
 * 
 * @param comitente - ID de comitente
 * @param cuotapartista - ID de cuotapartista
 * @param cuentaNorm - Cuenta normalizada
 * @param config - Configuración del matcher
 * @returns Resultado del matching
 */
export async function matchClient(
  comitente: number,
  cuotapartista: number,
  cuentaNorm: string | null,
  config: MatcherConfig = {}
): Promise<MatchResult> {
  // P1: Match por comitente
  const p1 = await matchByComitente(comitente);
  if (p1.matched) return p1;
  
  // P2: Match por cuotapartista
  const p2 = await matchByCuotapartista(cuotapartista);
  if (p2.matched) return p2;
  
  // P3: Match por cuenta_norm
  if (cuentaNorm) {
    const p3 = await matchByCuentaNorm(cuentaNorm);
    if (p3.matched) return p3;
  }
  
  // P4: Match fuzzy (si está habilitado)
  if (config.fuzzyEnabled && cuentaNorm) {
    const p4 = await matchByCuentaFuzzy(cuentaNorm, config.fuzzyThreshold || 2);
    if (p4.matchStatus === 'pending') return p4;
  }
  
  // Si ninguna regla matcheó
  return {
    matched: false,
    matchStatus: 'no_match',
    confidence: 0,
    context: {
      rulesApplied: ['P1', 'P2', 'P3', config.fuzzyEnabled ? 'P4' : null].filter(Boolean),
      comitente,
      cuotapartista,
      cuentaNorm
    }
  };
}

/**
 * Registra el resultado del matching en matching_audit
 * 
 * @param sourceTable - stg_cluster_cuentas | stg_comisiones
 * @param sourceRecordId - ID del registro source
 * @param matchResult - Resultado del matching
 * @param runId - ID del run de integración (opcional)
 */
export async function auditMatch(
  sourceTable: 'stg_cluster_cuentas' | 'stg_comisiones',
  sourceRecordId: string,
  matchResult: MatchResult,
  runId?: string
): Promise<void> {
  await db().insert(matchingAudit).values({
    runId: runId || null,
    sourceTable,
    sourceRecordId,
    matchStatus: matchResult.matchStatus,
    matchRule: matchResult.matchRule || null,
    targetClientId: matchResult.targetClientId || null,
    targetAdvisorId: null, // Se setea después si aplica
    confidence: matchResult.confidence.toString(),
    context: matchResult.context
  });
}

/**
 * Obtiene el owner (asesor) de un cliente desde fact_aum_snapshot (más reciente)
 * 
 * @param clientId - ID del cliente
 * @returns ID del asesor owner o null
 */
export async function getClientOwner(clientId: string): Promise<string | null> {
  const latestSnapshot = await db()
    .select({ idAdvisorOwner: factAumSnapshot.idAdvisorOwner })
    .from(factAumSnapshot)
    .where(eq(factAumSnapshot.idClient, clientId))
    .orderBy(desc(factAumSnapshot.snapshotDate))
    .limit(1);
  
  return latestSnapshot.length > 0 ? latestSnapshot[0].idAdvisorOwner : null;
}

/**
 * Valida si hay mismatch entre owner y beneficiario
 * Retorna MatchResult con estado mismatch_owner_benef si aplica
 * 
 * @param clientId - ID del cliente matched
 * @param benefAdvisorId - ID del asesor beneficiario (desde comisión)
 * @param baseMatchResult - Resultado del matching base (P1-P4)
 * @returns MatchResult con estado actualizado
 */
export async function validateOwnerBenefMatch(
  clientId: string,
  benefAdvisorId: string | null,
  baseMatchResult: MatchResult
): Promise<MatchResult> {
  // Obtener owner del cliente
  const ownerAdvisorId = await getClientOwner(clientId);
  
  // Si no hay beneficiario o no hay owner, no hay mismatch (aún)
  if (!benefAdvisorId || !ownerAdvisorId) {
    return {
      ...baseMatchResult,
      ownerAdvisorId,
      benefAdvisorId
    };
  }
  
  // Comparar owner vs beneficiario
  if (ownerAdvisorId !== benefAdvisorId) {
    return {
      ...baseMatchResult,
      matchStatus: 'mismatch_owner_benef',
      matched: false,
      confidence: 0.5, // Confianza media (matched pero con conflicto)
      ownerAdvisorId,
      benefAdvisorId,
      context: {
        ...baseMatchResult.context,
        ownerAdvisorId,
        benefAdvisorId,
        reason: 'Owner del cliente difiere del beneficiario de la comisión'
      }
    };
  }
  
  // Owner y beneficiario coinciden: match válido
  return {
    ...baseMatchResult,
    ownerAdvisorId,
    benefAdvisorId
  };
}

/**
 * Calcula KPI de matching para un run o globalmente
 * 
 * @param runId - ID del run (opcional, si null retorna global)
 * @returns Métricas de matching
 */
export async function getMatchingMetrics(runId?: string): Promise<{
  total: number;
  matched: number;
  multiMatch: number;
  noMatch: number;
  pending: number;
  mismatchOwnerBenef: number;
  matchRate: number;
}> {
  const whereClause = runId ? eq(matchingAudit.runId, runId) : sql`1=1`;
  
  const results = await db()
    .select({
      matchStatus: matchingAudit.matchStatus,
      count: sql<number>`COUNT(*)::int`
    })
    .from(matchingAudit)
    .where(whereClause)
    .groupBy(matchingAudit.matchStatus);
  
  const stats = {
    matched: 0,
    multi_match: 0,
    no_match: 0,
    pending: 0,
    mismatch_owner_benef: 0
  };
  
  results.forEach((r: any) => {
    const status = r.matchStatus as keyof typeof stats;
    stats[status] = r.count;
  });
  
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const matchRate = total > 0 ? (stats.matched / total) * 100 : 0;
  
  return {
    total,
    matched: stats.matched,
    multiMatch: stats.multi_match,
    noMatch: stats.no_match,
    pending: stats.pending,
    mismatchOwnerBenef: stats.mismatch_owner_benef,
    matchRate
  };
}




