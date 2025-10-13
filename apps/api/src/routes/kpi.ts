/**
 * APIs para cálculo de AUM y Comisiones
 * Implementa STORY 6 - KAN-127
 */

import { Router, type Request, type Response } from 'express';
import { db, factAumSnapshot, factCommission, dimClient, dimAdvisor } from '@cactus/db';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/kpi/aum
 * AUM agregado por dimensión
 * 
 * Query params:
 * - date: YYYY-MM-DD (default: última fecha disponible)
 * - groupBy: client | advisor | equipo | unidad (default: client)
 * - clientId: UUID (opcional, filtro)
 * - advisorId: UUID (opcional, filtro)
 * - equipo: string (opcional, filtro)
 * 
 * Returns:
 * - data: array de registros con AUM agregado
 * - total: AUM total
 * - date: fecha del snapshot
 */
router.get('/aum', async (req: Request, res: Response) => {
  try {
    const { date, groupBy = 'client', clientId, advisorId, equipo } = req.query;
    
    let snapshotDate: string;
    
    if (date) {
      snapshotDate = date as string;
    } else {
      // Obtener última fecha disponible
      const [latest] = await db()
    .select({ maxDate: sql<string>`MAX(${factAumSnapshot.snapshotDate})` })
        .from(factAumSnapshot);
      
      snapshotDate = latest?.maxDate || new Date().toISOString().split('T')[0];
    }
    
    // Construir WHERE clause
    let whereClause = eq(factAumSnapshot.snapshotDate, snapshotDate);
    
    if (clientId) {
      whereClause = and(whereClause, eq(factAumSnapshot.idClient, clientId as string))!;
    }
    
    if (advisorId) {
      whereClause = and(whereClause, eq(factAumSnapshot.idAdvisorOwner, advisorId as string))!;
    }
    
    // Query base
    let query;
    
    if (groupBy === 'client') {
      query = db()
        .select({
          clientId: factAumSnapshot.idClient,
          client: dimClient,
          aumUsd: sql<string>`SUM(${factAumSnapshot.aumUsd})`,
          bolsaArg: sql<string>`SUM(${factAumSnapshot.bolsaArg})`,
          fondosArg: sql<string>`SUM(${factAumSnapshot.fondosArg})`,
          bolsaBci: sql<string>`SUM(${factAumSnapshot.bolsaBci})`,
          pesos: sql<string>`SUM(${factAumSnapshot.pesos})`,
          mep: sql<string>`SUM(${factAumSnapshot.mep})`,
          cable: sql<string>`SUM(${factAumSnapshot.cable})`,
          cv7000: sql<string>`SUM(${factAumSnapshot.cv7000})`,
          cv10000: sql<string>`SUM(${factAumSnapshot.cv10000})`
        })
        .from(factAumSnapshot)
        .leftJoin(dimClient, eq(factAumSnapshot.idClient, dimClient.id))
        .where(whereClause)
        .groupBy(factAumSnapshot.idClient, dimClient.id);
    } else if (groupBy === 'advisor') {
      query = db()
        .select({
          advisorId: factAumSnapshot.idAdvisorOwner,
          advisor: dimAdvisor,
          aumUsd: sql<string>`SUM(${factAumSnapshot.aumUsd})`,
          clientCount: sql<number>`COUNT(DISTINCT ${factAumSnapshot.idClient})::int`
        })
        .from(factAumSnapshot)
        .leftJoin(dimAdvisor, eq(factAumSnapshot.idAdvisorOwner, dimAdvisor.id))
        .where(whereClause)
        .groupBy(factAumSnapshot.idAdvisorOwner, dimAdvisor.id);
    } else if (groupBy === 'equipo') {
      query = db()
        .select({
          equipo: dimClient.equipo,
          aumUsd: sql<string>`SUM(${factAumSnapshot.aumUsd})`,
          clientCount: sql<number>`COUNT(DISTINCT ${factAumSnapshot.idClient})::int`
        })
        .from(factAumSnapshot)
        .leftJoin(dimClient, eq(factAumSnapshot.idClient, dimClient.id))
        .where(whereClause)
        .groupBy(dimClient.equipo);
    } else {
      // unidad
      query = db()
        .select({
          unidad: dimClient.unidad,
          aumUsd: sql<string>`SUM(${factAumSnapshot.aumUsd})`,
          clientCount: sql<number>`COUNT(DISTINCT ${factAumSnapshot.idClient})::int`
        })
        .from(factAumSnapshot)
        .leftJoin(dimClient, eq(factAumSnapshot.idClient, dimClient.id))
        .where(whereClause)
        .groupBy(dimClient.unidad);
    }
    
    const data = await query;
    
    // Calcular total
    const [{ total }] = await db()
      .select({ total: sql<string>`SUM(${factAumSnapshot.aumUsd})` })
      .from(factAumSnapshot)
      .where(whereClause);
    
    return res.json({
      data,
      total: parseFloat(total || '0'),
      date: snapshotDate,
      groupBy
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error calculando AUM');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/kpi/comisiones
 * Comisiones agregadas por dimensión
 * 
 * Query params:
 * - from: YYYY-MM-DD (required)
 * - to: YYYY-MM-DD (required)
 * - groupBy: client | advisor | equipo | unidad | ticker | tipo (default: client)
 * - clientId: UUID (opcional)
 * - advisorId: UUID (opcional)
 * 
 * Returns:
 * - data: array con comisiones agregadas
 * - total: comisión total USD
 * - period: { from, to }
 */
router.get('/comisiones', async (req: Request, res: Response) => {
  try {
    const { from, to, groupBy = 'client', clientId, advisorId } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        error: 'Parámetros "from" y "to" son requeridos'
      });
    }
    
    // Construir WHERE clause
    let whereClause = and(
      gte(factCommission.fecha, from as string),
      lte(factCommission.fecha, to as string)
    )!;
    
    if (clientId) {
      whereClause = and(whereClause, eq(factCommission.idClient, clientId as string))!;
    }
    
    if (advisorId) {
      whereClause = and(whereClause, eq(factCommission.idAdvisorBenef, advisorId as string))!;
    }
    
    // Query según groupBy
    let query;
    
    if (groupBy === 'client') {
      query = db()
        .select({
          clientId: factCommission.idClient,
          client: dimClient,
          comisionUsd: sql<string>`SUM(${factCommission.comisionUsd})`,
          comisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})`,
          opCount: sql<number>`COUNT(*)::int`,
          mismatchCount: sql<number>`SUM(CASE WHEN ${factCommission.ownerVsBenefMismatch} THEN 1 ELSE 0 END)::int`
        })
        .from(factCommission)
        .leftJoin(dimClient, eq(factCommission.idClient, dimClient.id))
        .where(whereClause)
        .groupBy(factCommission.idClient, dimClient.id);
    } else if (groupBy === 'advisor') {
      query = db()
        .select({
          advisorId: factCommission.idAdvisorBenef,
          advisor: dimAdvisor,
          comisionUsd: sql<string>`SUM(${factCommission.comisionUsd})`,
          comisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})`,
          opCount: sql<number>`COUNT(*)::int`
        })
        .from(factCommission)
        .leftJoin(dimAdvisor, eq(factCommission.idAdvisorBenef, dimAdvisor.id))
        .where(whereClause)
        .groupBy(factCommission.idAdvisorBenef, dimAdvisor.id);
    } else if (groupBy === 'ticker') {
      query = db()
        .select({
          ticker: factCommission.ticker,
          comisionUsd: sql<string>`SUM(${factCommission.comisionUsd})`,
          comisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})`,
          opCount: sql<number>`COUNT(*)::int`
        })
        .from(factCommission)
        .where(whereClause)
        .groupBy(factCommission.ticker);
    } else if (groupBy === 'tipo') {
      query = db()
        .select({
          tipo: factCommission.tipo,
          comisionUsd: sql<string>`SUM(${factCommission.comisionUsd})`,
          comisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})`,
          opCount: sql<number>`COUNT(*)::int`
        })
        .from(factCommission)
        .where(whereClause)
        .groupBy(factCommission.tipo);
    } else if (groupBy === 'equipo') {
      query = db()
        .select({
          equipo: factCommission.equipo,
          comisionUsd: sql<string>`SUM(${factCommission.comisionUsd})`,
          comisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})`,
          opCount: sql<number>`COUNT(*)::int`
        })
        .from(factCommission)
        .where(whereClause)
        .groupBy(factCommission.equipo);
    } else {
      // unidad
      query = db()
        .select({
          unidad: factCommission.unidad,
          comisionUsd: sql<string>`SUM(${factCommission.comisionUsd})`,
          comisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})`,
          opCount: sql<number>`COUNT(*)::int`
        })
        .from(factCommission)
        .where(whereClause)
        .groupBy(factCommission.unidad);
    }
    
    const data = await query;
    
    // Total
    const [{ total }] = await db()
      .select({ total: sql<string>`COALESCE(SUM(${factCommission.comisionUsd}), 0)` })
      .from(factCommission)
      .where(whereClause);
    
    return res.json({
      data,
      total: parseFloat(total || '0'),
      period: { from, to },
      groupBy
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error calculando comisiones');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/kpi/aum/client/:clientId
 * AUM de un cliente específico con histórico
 * 
 * Returns:
 * - current: snapshot actual
 * - history: array de snapshots históricos
 */
router.get('/aum/client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    const history = await db()
      .select()
      .from(factAumSnapshot)
      .where(eq(factAumSnapshot.idClient, clientId))
      .orderBy(factAumSnapshot.snapshotDate);
    
    const current = history[history.length - 1] || null;
    
    return res.json({
      current,
      history
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo AUM del cliente');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/kpi/comisiones/advisor/:advisorId
 * Comisiones de un asesor con breakdown por periodo
 * 
 * Query params:
 * - from: YYYY-MM-DD
 * - to: YYYY-MM-DD
 * 
 * Returns:
 * - total: comisión total
 * - byMonth: array con totales por mes
 * - byClient: top clientes
 */
router.get('/comisiones/advisor/:advisorId', async (req: Request, res: Response) => {
  try {
    const { advisorId } = req.params;
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        error: 'Parámetros "from" y "to" son requeridos'
      });
    }
    
    const whereClause = and(
      eq(factCommission.idAdvisorBenef, advisorId),
      gte(factCommission.fecha, from as string),
      lte(factCommission.fecha, to as string)
    )!;
    
    // Total
    const [{ total }] = await db()
      .select({ total: sql<string>`COALESCE(SUM(${factCommission.comisionUsdAlloc}), 0)` })
      .from(factCommission)
      .where(whereClause);
    
    // Por mes
    const byMonth = await db()
      .select({
        month: sql<string>`TO_CHAR(${factCommission.fecha}, 'YYYY-MM')`,
        total: sql<string>`SUM(${factCommission.comisionUsdAlloc})`
      })
      .from(factCommission)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(${factCommission.fecha}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${factCommission.fecha}, 'YYYY-MM')`);
    
    // Top clientes
    const byClient = await db()
      .select({
        clientId: factCommission.idClient,
        client: dimClient,
        total: sql<string>`SUM(${factCommission.comisionUsdAlloc})`
      })
      .from(factCommission)
      .leftJoin(dimClient, eq(factCommission.idClient, dimClient.id))
      .where(whereClause)
      .groupBy(factCommission.idClient, dimClient.id)
      .orderBy(sql`SUM(${factCommission.comisionUsdAlloc}) DESC`)
      .limit(10);
    
    return res.json({
      total: parseFloat(total || '0'),
      byMonth,
      byClient
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo comisiones del asesor');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

export default router;




