/**
 * Endpoints de consulta para AUM y Comisiones
 * Según superprompt: vistas consumibles vw_aum_diario, vw_comisiones
 */

import { Router, type Request, type Response } from 'express';
import { db, factAumSnapshot, factCommission, dimClient, dimAdvisor } from '@cactus/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/aum
 * Consulta de AUM por fecha y/o asesor
 * 
 * Query params:
 * - fecha: YYYY-MM-DD (opcional, default: última fecha disponible)
 * - asesor: UUID del asesor (opcional)
 * - equipo: nombre del equipo (opcional)
 * - limit: number (default: 100, max: 500)
 * - offset: number (default: 0)
 * 
 * Returns:
 * - items: array de snapshots de AUM con joins a dims
 * - total: total de registros
 * - pagination: info de paginación
 */
router.get('/aum', async (req: Request, res: Response) => {
  try {
    const {
      fecha,
      asesor,
      equipo,
      limit = '100',
      offset = '0'
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string, 10), 500);
    const offsetNum = parseInt(offset as string, 10);
    
    // Construir WHERE clause
    let whereConditions: any[] = [];
    
    // Si no hay fecha, usar la última disponible
    let targetDate = fecha as string | undefined;
    if (!targetDate) {
      const latestDateResult = await db()
        .select({ date: factAumSnapshot.snapshotDate })
        .from(factAumSnapshot)
        .orderBy(desc(factAumSnapshot.snapshotDate))
        .limit(1);
      
      if (latestDateResult.length > 0) {
        targetDate = latestDateResult[0].date;
      }
    }
    
    if (targetDate) {
      whereConditions.push(eq(factAumSnapshot.snapshotDate, targetDate));
    }
    
    if (asesor) {
      whereConditions.push(eq(factAumSnapshot.idAdvisorOwner, asesor as string));
    }
    
    // Join con dims para filtros adicionales
    const query = db()
      .select({
        id: factAumSnapshot.id,
        snapshotDate: factAumSnapshot.snapshotDate,
        aumUsd: factAumSnapshot.aumUsd,
        // Breakdowns
        bolsaArg: factAumSnapshot.bolsaArg,
        fondosArg: factAumSnapshot.fondosArg,
        bolsaBci: factAumSnapshot.bolsaBci,
        pesos: factAumSnapshot.pesos,
        mep: factAumSnapshot.mep,
        cable: factAumSnapshot.cable,
        cv7000: factAumSnapshot.cv7000,
        cv10000: factAumSnapshot.cv10000,
        // Cliente
        clientId: dimClient.id,
        comitente: dimClient.comitente,
        cuotapartista: dimClient.cuotapartista,
        cuentaNorm: dimClient.cuentaNorm,
        clientEquipo: dimClient.equipo,
        clientUnidad: dimClient.unidad,
        // Asesor owner
        advisorId: dimAdvisor.id,
        advisorNorm: dimAdvisor.asesorNorm,
        advisorEquipo: dimAdvisor.equipo,
        advisorUnidad: dimAdvisor.unidad
      })
      .from(factAumSnapshot)
      .leftJoin(dimClient, eq(factAumSnapshot.idClient, dimClient.id))
      .leftJoin(dimAdvisor, eq(factAumSnapshot.idAdvisorOwner, dimAdvisor.id));
    
    // Aplicar where conditions
    let finalQuery = query;
    if (whereConditions.length > 0) {
      finalQuery = finalQuery.where(and(...whereConditions));
    }
    
    // Filtro por equipo (campo en dimAdvisor)
    if (equipo) {
      finalQuery = finalQuery.where(eq(dimAdvisor.equipo, equipo as string));
    }
    
    // Ejecutar con paginación
    const items = await finalQuery
      .orderBy(desc(factAumSnapshot.aumUsd))
      .limit(limitNum)
      .offset(offsetNum);
    
    // Contar total (sin paginación)
    const countQuery = db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(factAumSnapshot);
    
    if (whereConditions.length > 0) {
      countQuery.where(and(...whereConditions));
    }
    
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    
    // Calcular totales agregados
    const totalsQuery = db()
      .select({
        totalAum: sql<string>`SUM(${factAumSnapshot.aumUsd})::numeric`,
        totalClientes: sql<number>`COUNT(DISTINCT ${factAumSnapshot.idClient})::int`
      })
      .from(factAumSnapshot);
    
    if (whereConditions.length > 0) {
      totalsQuery.where(and(...whereConditions));
    }
    
    const totalsResult = await totalsQuery;
    const totals = totalsResult[0] || { totalAum: '0', totalClientes: 0 };
    
    return res.json({
      items,
      total,
      totals,
      filters: {
        fecha: targetDate,
        asesor,
        equipo
      },
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error consultando AUM');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/comisiones
 * Consulta de comisiones por rango de fechas y/o asesor
 * 
 * Query params:
 * - desde: YYYY-MM-DD (opcional, default: hace 30 días)
 * - hasta: YYYY-MM-DD (opcional, default: hoy)
 * - asesor: UUID del asesor beneficiario (opcional)
 * - equipo: nombre del equipo (opcional)
 * - limit: number (default: 100, max: 500)
 * - offset: number (default: 0)
 * 
 * Returns:
 * - items: array de comisiones con joins a dims
 * - total: total de registros
 * - totals: agregados (suma de comisiones)
 * - pagination: info de paginación
 */
router.get('/comisiones', async (req: Request, res: Response) => {
  try {
    const {
      desde,
      hasta,
      asesor,
      equipo,
      limit = '100',
      offset = '0'
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string, 10), 500);
    const offsetNum = parseInt(offset as string, 10);
    
    // Defaults de fechas
    const desdeDate = desde
      ? (desde as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hastaDate = hasta
      ? (hasta as string)
      : new Date().toISOString().split('T')[0];
    
    // Construir WHERE clause
    let whereConditions: any[] = [
      gte(factCommission.fecha, desdeDate),
      lte(factCommission.fecha, hastaDate)
    ];
    
    if (asesor) {
      whereConditions.push(eq(factCommission.idAdvisorBenef, asesor as string));
    }
    
    // Join con dims
    const query = db()
      .select({
        id: factCommission.id,
        opId: factCommission.opId,
        fecha: factCommission.fecha,
        ticker: factCommission.ticker,
        tipo: factCommission.tipo,
        cantidad: factCommission.cantidad,
        precio: factCommission.precio,
        comisionUsd: factCommission.comisionUsd,
        comisionUsdAlloc: factCommission.comisionUsdAlloc,
        ivaArs: factCommission.ivaArs,
        porcentajeAlloc: factCommission.porcentajeAlloc,
        equipo: factCommission.equipo,
        unidad: factCommission.unidad,
        ownerVsBenefMismatch: factCommission.ownerVsBenefMismatch,
        // Cliente
        clientId: dimClient.id,
        comitente: dimClient.comitente,
        cuotapartista: dimClient.cuotapartista,
        cuentaNorm: dimClient.cuentaNorm,
        // Asesor beneficiario
        advisorId: dimAdvisor.id,
        advisorNorm: dimAdvisor.asesorNorm,
        advisorEquipo: dimAdvisor.equipo,
        advisorUnidad: dimAdvisor.unidad
      })
      .from(factCommission)
      .leftJoin(dimClient, eq(factCommission.idClient, dimClient.id))
      .leftJoin(dimAdvisor, eq(factCommission.idAdvisorBenef, dimAdvisor.id));
    
    // Aplicar where conditions
    let finalQuery = query.where(and(...whereConditions));
    
    // Filtro por equipo (campo en dimAdvisor)
    if (equipo) {
      finalQuery = finalQuery.where(eq(dimAdvisor.equipo, equipo as string));
    }
    
    // Ejecutar con paginación
    const items = await finalQuery
      .orderBy(desc(factCommission.fecha), desc(factCommission.comisionUsdAlloc))
      .limit(limitNum)
      .offset(offsetNum);
    
    // Contar total (sin paginación)
    const countQuery = db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(factCommission)
      .where(and(...whereConditions));
    
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;
    
    // Calcular totales agregados
    const totalsQuery = db()
      .select({
        totalComisionUsd: sql<string>`SUM(${factCommission.comisionUsd})::numeric`,
        totalComisionUsdAlloc: sql<string>`SUM(${factCommission.comisionUsdAlloc})::numeric`,
        totalOperaciones: sql<number>`COUNT(*)::int`,
        totalAsesores: sql<number>`COUNT(DISTINCT ${factCommission.idAdvisorBenef})::int`
      })
      .from(factCommission)
      .where(and(...whereConditions));
    
    const totalsResult = await totalsQuery;
    const totals = totalsResult[0] || {
      totalComisionUsd: '0',
      totalComisionUsdAlloc: '0',
      totalOperaciones: 0,
      totalAsesores: 0
    };
    
    // Validar cierre por operación (±0.01)
    // Según superprompt, cada operación debe cerrar con tolerancia 0.01
    const closureValidation = items.map((item: any) => {
      const comisionUsd = parseFloat(item.comisionUsd || '0');
      const comisionUsdAlloc = parseFloat(item.comisionUsdAlloc || '0');
      const porcentajeAlloc = parseFloat(item.porcentajeAlloc || '100');
      
      const expectedAlloc = (comisionUsd * porcentajeAlloc) / 100;
      const diff = Math.abs(comisionUsdAlloc - expectedAlloc);
      
      return {
        opId: item.opId,
        valid: diff <= 0.01,
        diff
      };
    });
    
    const invalidClosures = closureValidation.filter((c: any) => !c.valid);
    
    return res.json({
      items,
      total,
      totals,
      filters: {
        desde: desdeDate,
        hasta: hastaDate,
        asesor,
        equipo
      },
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      },
      dataQuality: {
        invalidClosures: invalidClosures.length,
        closureRate: ((closureValidation.length - invalidClosures.length) / closureValidation.length * 100).toFixed(2)
      }
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error consultando comisiones');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/comisiones/mismatch-owner-benef
 * Consulta de comisiones con mismatch entre owner y beneficiario
 * Según superprompt: estado mismatch_owner_benef cuando owner del cliente ≠ beneficiario
 * 
 * Query params:
 * - limit: number (default: 100, max: 500)
 * - offset: number (default: 0)
 * 
 * Returns:
 * - items: array de comisiones con mismatch
 * - total: total de registros
 */
router.get('/comisiones/mismatch-owner-benef', async (req: Request, res: Response) => {
  try {
    const { limit = '100', offset = '0' } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string, 10), 500);
    const offsetNum = parseInt(offset as string, 10);
    
    // Filtrar solo las que tienen mismatch
    const items = await db()
      .select({
        id: factCommission.id,
        opId: factCommission.opId,
        fecha: factCommission.fecha,
        comisionUsdAlloc: factCommission.comisionUsdAlloc,
        // Cliente
        comitente: dimClient.comitente,
        cuotapartista: dimClient.cuotapartista,
        cuentaNorm: dimClient.cuentaNorm,
        // Asesor beneficiario
        benefAdvisorId: dimAdvisor.id,
        benefAdvisorNorm: dimAdvisor.asesorNorm
      })
      .from(factCommission)
      .leftJoin(dimClient, eq(factCommission.idClient, dimClient.id))
      .leftJoin(dimAdvisor, eq(factCommission.idAdvisorBenef, dimAdvisor.id))
      .where(eq(factCommission.ownerVsBenefMismatch, true))
      .orderBy(desc(factCommission.fecha))
      .limit(limitNum)
      .offset(offsetNum);
    
    // Contar total
    const countResult = await db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(factCommission)
      .where(eq(factCommission.ownerVsBenefMismatch, true));
    
    const total = countResult[0]?.count || 0;
    
    return res.json({
      items,
      total,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      }
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error consultando mismatches');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

export default router;

