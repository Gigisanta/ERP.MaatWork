/**
 * Rutas API para el sistema ETL de EPIC A
 * Endpoints para ingesta de reportes de Cluster Cuentas y Comisiones
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { sql } from 'drizzle-orm';
import { ingestClusterCuentas } from '../etl/loaders/cluster-cuentas-loader';
import { ingestAumMadre } from '../etl/loaders/aum-madre-loader-simple';
import Papa from 'papaparse';
import XLSX from 'xlsx';

const router = Router();

// Configurar multer para subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB max para archivos grandes
  },
  fileFilter: (req, file, cb) => {
    // Aceptar CSV, XLSX y XLS
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos .csv, .xlsx o .xls'));
    }
  }
});

/**
 * POST /api/etl/cluster-cuentas
 * Ingesta de reporte Cluster Cuentas
 * 
 * Body (multipart/form-data):
 * - file: archivo .xlsx
 * - snapshotDate: fecha del snapshot (opcional, default: hoy)
 * 
 * Returns:
 * - parseMetrics: métricas del parsing
 * - loadResult: resultado de la carga a DB
 * - success: boolean
 */
router.post(
  '/cluster-cuentas',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No se proporcionó archivo'
        });
      }
      
      // Parsear fecha del snapshot
      const snapshotDate = req.body.snapshotDate
        ? new Date(req.body.snapshotDate)
        : new Date();
      
      if (isNaN(snapshotDate.getTime())) {
        return res.status(400).json({
          error: 'Fecha de snapshot inválida'
        });
      }
      
      // Leer Excel
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet);
      
      req.log.info(
        { fileName: req.file.originalname, rowCount: rawRows.length },
        'Iniciando ingesta de Cluster Cuentas'
      );
      
      // Ejecutar pipeline de ingesta
      const result = await ingestClusterCuentas(rawRows, snapshotDate);
      
      req.log.info(
        {
          parseMetrics: result.parseMetrics,
          loadResult: result.loadResult
        },
        'Ingesta de Cluster Cuentas completada'
      );
      
      const statusCode = result.success ? 200 : 207; // 207 Multi-Status si hay errores parciales
      
      return res.status(statusCode).json(result);
      
    } catch (error) {
      req.log.error({ err: error }, 'Error en ingesta de Cluster Cuentas');
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * POST /api/etl/aum-madre
 * Ingesta del CSV Madre "Balanz Cactus 2025 - AUM Balanz.csv"
 * FUENTE AUTORITATIVA de AUM y owner por cuenta/cliente
 * 
 * Body (multipart/form-data):
 * - file: archivo .csv (con coma decimal y formato dd/mm/yyyy)
 * - snapshotDate: fecha del snapshot (opcional, default: hoy)
 * 
 * Returns:
 * - parseMetrics: métricas del parsing
 * - loadResult: resultado de la carga a DB
 * - success: boolean
 */
router.post(
  '/aum-madre',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No se proporcionó archivo'
        });
      }
      
      // Parsear fecha del snapshot
      const snapshotDate = req.body.snapshotDate
        ? new Date(req.body.snapshotDate)
        : new Date();
      
      if (isNaN(snapshotDate.getTime())) {
        return res.status(400).json({
          error: 'Fecha de snapshot inválida'
        });
      }
      
      // Detectar tipo de archivo
      const isCSV = req.file.originalname.endsWith('.csv') || 
                    req.file.mimetype === 'text/csv' ||
                    req.file.mimetype === 'application/csv';
      
      let rawRows: any[];
      
      if (isCSV) {
        // Parsear CSV con coma decimal
        const csvString = req.file.buffer.toString('utf-8');
        const parsed = Papa.parse(csvString, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false // Mantener como strings para normalizar manualmente
        });
        rawRows = parsed.data;
      } else {
        // Parsear Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rawRows = XLSX.utils.sheet_to_json(sheet);
      }
      
      req.log.info(
        { fileName: req.file.originalname, rowCount: rawRows.length, snapshotDate },
        'Iniciando ingesta de AUM Madre (fuente autoritativa)'
      );
      
      // Ejecutar pipeline de ingesta
      const { ingestAumMadre } = await import('../etl/loaders/aum-madre-loader');
      const result = await ingestAumMadre(rawRows, snapshotDate);
      
      req.log.info(
        {
          parseMetrics: result.parseMetrics,
          loadResult: result.loadResult
        },
        'Ingesta de AUM Madre completada'
      );
      
      const statusCode = result.success ? 200 : 207; // 207 Multi-Status si hay errores parciales
      
      return res.status(statusCode).json(result);
      
    } catch (error) {
      req.log.error({ err: error }, 'Error en ingesta de AUM Madre');
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * POST /api/etl/comisiones
 * Ingesta de reporte Comisiones (STORY 3)
 * 
 * Body (multipart/form-data):
 * - file: archivo .xlsx
 * 
 * Returns:
 * - parseMetrics: métricas del parsing
 * - loadResult: resultado de la carga a DB (asesores + comisiones)
 * - success: boolean
 */
router.post(
  '/comisiones',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No se proporcionó archivo'
        });
      }
      
      // Leer Excel
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet);
      
      req.log.info(
        { fileName: req.file.originalname, rowCount: rawRows.length },
        'Iniciando ingesta de Comisiones'
      );
      
      // Ejecutar pipeline de ingesta
      const { ingestComisiones } = await import('../etl/loaders/comisiones-loader');
      const result = await ingestComisiones(rawRows);
      
      req.log.info(
        {
          parseMetrics: result.parseMetrics,
          loadResult: result.loadResult
        },
        'Ingesta de Comisiones completada'
      );
      
      const statusCode = result.success ? 200 : 207; // 207 Multi-Status si hay errores parciales
      
      return res.status(statusCode).json(result);
      
    } catch (error) {
      req.log.error({ err: error }, 'Error en ingesta de Comisiones');
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
);

/**
 * POST /api/etl/matching/run
 * Ejecuta el motor de matching sobre comisiones sin cliente asignado
 * STORY 4 - KAN-125
 * 
 * Body (opcional):
 * - fuzzyEnabled: boolean (default: true)
 * - fuzzyThreshold: number (default: 2)
 * 
 * Returns:
 * - Métricas del proceso de matching
 */
router.post('/matching/run', async (req: Request, res: Response) => {
  try {
    req.log.info('Iniciando proceso de conciliación simplificado');
    
    const { executeSimplifiedMatching } = await import('../etl/simplified-matching');
    
    const result = await executeSimplifiedMatching();
    
    req.log.info({
      success: result.success,
      stats: result.stats,
      errors: result.errors.length
    }, 'Proceso de conciliación completado');
    
    return res.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      errors: result.errors
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error ejecutando proceso de conciliación');
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/etl/matching/metrics
 * Obtiene KPIs del proceso de matching
 * STORY 4 - KAN-125
 * 
 * Query params:
 * - runId: UUID del run (opcional)
 */
router.get('/matching/metrics', async (req: Request, res: Response) => {
  try {
    const { runId } = req.query;
    
    const { getMatchingMetrics } = await import('../etl/matching/matcher');
    
    const metrics = await getMatchingMetrics(runId as string | undefined);
    
    return res.json(metrics);
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo métricas de matching');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/etl/dashboard
 * Dashboard de observabilidad con todas las métricas
 * STORY 7 - KAN-128
 * 
 * Query params:
 * - from: fecha inicio (ISO string)
 * - to: fecha fin (ISO string)
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    
    try {
      const { getDashboardMetrics } = await import('../etl/observability/dashboard');
      
      const metrics = await getDashboardMetrics(
        from as string | undefined,
        to as string | undefined
      );
      
      return res.json(metrics);
      
    } catch (dbError) {
      req.log.warn({ err: dbError }, 'Error de DB, usando fallback dashboard');
      
      // Fallback con datos mock cuando DB no está disponible
      const { getFallbackDashboard } = await import('../etl/observability/dashboard-fallback');
      const fallbackMetrics = getFallbackDashboard();
      
      return res.json(fallbackMetrics);
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo dashboard');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/etl/alerts
 * Verifica alertas activas
 * STORY 7 - KAN-128
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { checkAlerts } = await import('../etl/observability/dashboard');
    
    const alerts = await checkAlerts();
    
    return res.json({
      alerts,
      count: alerts.length,
      hasCritical: alerts.some(a => a.severity === 'critical')
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error verificando alertas');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/etl/metrics
 * Obtiene métricas agregadas de los procesos de ingesta
 * 
 * Query params:
 * - from: fecha inicio (ISO string)
 * - to: fecha fin (ISO string)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // TODO: Implementar consulta a integration_runs y staging tables
    // Por ahora retornar estructura básica
    
    return res.json({
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      avgProcessingTimeMs: 0,
      totalRowsProcessed: 0
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo métricas ETL');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});


/**
 * GET /api/etl/matching/pendientes
 * Obtiene casos de matching pendientes de resolución manual
 * 
 * Query params:
 * - estado: filtrar por estado (no_match | multi_match | mismatch_owner_benef | pending)
 * - page: número de página (default: 1)
 * - size: tamaño de página (default: 50, max: 250)
 * - search: búsqueda por comitente/cuenta
 */
router.get('/matching/pendientes', async (req: Request, res: Response) => {
  try {
    const { estado, page = '1', size = '50', search } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(250, Math.max(1, parseInt(size as string, 10)));
    const offset = (pageNum - 1) * pageSize;
    
    const { db, matchingAudit } = await import('@cactus/db');
    const { eq, and, or, like, isNull, sql } = await import('drizzle-orm');
    
    // Construir filtros
    let whereConditions = [];
    
    // Filtro por estados pendientes
    if (estado) {
      whereConditions.push(eq(matchingAudit.matchStatus, estado as string));
    } else {
      // Por default, mostrar solo los que requieren acción manual
      whereConditions.push(
        sql`${matchingAudit.matchStatus} IN ('no_match', 'multi_match', 'mismatch_owner_benef', 'pending')`
      );
    }
    
    // Solo casos sin resolver
    whereConditions.push(isNull(matchingAudit.resolvedAt));
    
    // Búsqueda (simplificada por ahora)
    // TODO: Join con staging tables para buscar por comitente/cuenta
    
    const where = and(...whereConditions);
    
    // Query paginado
    const results = await db()
      .select()
      .from(matchingAudit)
      .where(where)
      .limit(pageSize)
      .offset(offset)
      .orderBy(matchingAudit.createdAt);
    
    // Count total
    const [{ count }] = await db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(matchingAudit)
      .where(where);
    
    return res.json({
      data: results,
      pagination: {
        page: pageNum,
        size: pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo casos pendientes');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/etl/matching/resolver
 * Resuelve casos pendientes de matching (bulk con comentario obligatorio)
 * 
 * Body:
 * - items: [{ id_operacion|id_cuenta, target_ids, comentario }]
 * - action: confirm | merge | ignore | remap
 * 
 * Requiere comentario obligatorio y almacena en audit-log WORM
 */
router.post('/matching/resolver', async (req: Request, res: Response) => {
  try {
    const { items, action } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Se requiere un array de items no vacío'
      });
    }
    
    if (!action || !['confirm', 'merge', 'ignore', 'remap'].includes(action)) {
      return res.status(400).json({
        error: 'Action inválido (debe ser: confirm, merge, ignore, remap)'
      });
    }
    
    const { db, matchingAudit } = await import('@cactus/db');
    const { eq } = await import('drizzle-orm');
    
    const resolved = [];
    const errors = [];
    
    for (const item of items) {
      const { id, target_ids, comentario } = item;
      
      // Validar comentario obligatorio
      if (!comentario || comentario.trim() === '') {
        errors.push({ id, error: 'Comentario obligatorio' });
        continue;
      }
      
      try {
        // Buscar matching_audit por id
        const auditRecords = await db()
          .select()
          .from(matchingAudit)
          .where(eq(matchingAudit.id, id))
          .limit(1);
        
        if (auditRecords.length === 0) {
          errors.push({ id, error: 'Matching audit no encontrado' });
          continue;
        }
        
        const auditRecord = auditRecords[0];
        
        // TODO: Implementar tabla matching_resolutions cuando esté disponible
        // Insertar en matching_resolutions (WORM)
        // await db().insert(matchingResolutions).values({
        //   matchingAuditId: auditRecord.id,
        //   action,
        //   targetIds: target_ids || [],
        //   comment: comentario,
        //   resolvedByUserId: req.user?.id || null, // Asume middleware de auth
        //   resolvedAt: new Date()
        // });
        
        // Actualizar matching_audit con resolución
        await db()
          .update(matchingAudit)
          .set({
            resolvedByUserId: req.user?.id || null,
            resolvedAt: new Date(),
            resolutionComment: comentario
          })
          .where(eq(matchingAudit.id, auditRecord.id));
        
        resolved.push({ id, status: 'resolved' });
        
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push({ id, error: msg });
      }
    }
    
    req.log.info({ resolved: resolved.length, errors: errors.length }, 'Resolución de matching completada');
    
    return res.json({
      resolved,
      errors,
      summary: {
        total: items.length,
        resolved: resolved.length,
        errors: errors.length
      }
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error resolviendo matching');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/etl/aum
 * Consulta fact_aum_snapshot con filtros
 * 
 * Query params:
 * - fecha: fecha específica (ISO string)
 * - desde: fecha inicio (ISO string)
 * - hasta: fecha fin (ISO string)
 * - advisor_id: filtrar por asesor owner
 * - page: número de página (default: 1)
 * - size: tamaño de página (default: 50, max: 250)
 */
router.get('/aum', async (req: Request, res: Response) => {
  try {
    const { fecha, desde, hasta, advisor_id, page = '1', size = '50' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(250, Math.max(1, parseInt(size as string, 10)));
    const offset = (pageNum - 1) * pageSize;
    
    const { db, factAumSnapshot, dimClient, dimAdvisor } = await import('@cactus/db');
    const { eq, and, gte, lte, sql } = await import('drizzle-orm');
    
    // Construir filtros
    let whereConditions = [];
    
    if (fecha) {
      whereConditions.push(eq(factAumSnapshot.snapshotDate, fecha as string));
    } else {
      if (desde) {
        whereConditions.push(gte(factAumSnapshot.snapshotDate, desde as string));
      }
      if (hasta) {
        whereConditions.push(lte(factAumSnapshot.snapshotDate, hasta as string));
      }
    }
    
    if (advisor_id) {
      whereConditions.push(eq(factAumSnapshot.idAdvisorOwner, advisor_id as string));
    }
    
    const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Query con joins
    const results = await db()
      .select({
        id: factAumSnapshot.id,
        snapshotDate: factAumSnapshot.snapshotDate,
        aumUsd: factAumSnapshot.aumUsd,
        breakdowns: {
          bolsaArg: factAumSnapshot.bolsaArg,
          fondosArg: factAumSnapshot.fondosArg,
          bolsaBci: factAumSnapshot.bolsaBci,
          pesos: factAumSnapshot.pesos,
          mep: factAumSnapshot.mep,
          cable: factAumSnapshot.cable,
          cv7000: factAumSnapshot.cv7000,
          cv10000: factAumSnapshot.cv10000
        },
        client: {
          id: dimClient.id,
          comitente: dimClient.comitente,
          cuotapartista: dimClient.cuotapartista,
          cuentaNorm: dimClient.cuentaNorm
        },
        advisorOwner: {
          id: dimAdvisor.id,
          asesorNorm: dimAdvisor.asesorNorm,
          equipo: dimAdvisor.equipo
        }
      })
      .from(factAumSnapshot)
      .leftJoin(dimClient, eq(factAumSnapshot.idClient, dimClient.id))
      .leftJoin(dimAdvisor, eq(factAumSnapshot.idAdvisorOwner, dimAdvisor.id))
      .where(where)
      .limit(pageSize)
      .offset(offset)
      .orderBy(factAumSnapshot.snapshotDate);
    
    // Count total
    const [{ count }] = await db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(factAumSnapshot)
      .where(where);
    
    return res.json({
      data: results,
      pagination: {
        page: pageNum,
        size: pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
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
 * GET /api/etl/config
 * Obtiene la configuración actual del ETL
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const { getETLConfig } = await import('../etl/config');
    const config = getETLConfig();
    
    return res.json(config);
    
  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo configuración ETL');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/etl/config
 * Guarda la configuración del ETL
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    
    // Validar configuración
    const validationErrors = validateETLConfig(config);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Configuración inválida',
        details: validationErrors
      });
    }
    
    // Actualizar configuración en memoria
    const { setETLConfig } = await import('../etl/config');
    setETLConfig(config);
    
    req.log.info({ config }, 'Configuración ETL actualizada');
    
    return res.json({
      success: true,
      message: 'Configuración guardada exitosamente'
    });
    
  } catch (error) {
    req.log.error({ err: error }, 'Error guardando configuración ETL');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Valida la configuración del ETL
 */
function validateETLConfig(config: any): string[] {
  const errors: string[] = [];
  
  // Validar parsing
  if (config.parsing) {
    if (typeof config.parsing.breakdownTolerance !== 'number' || config.parsing.breakdownTolerance < 0) {
      errors.push('breakdownTolerance debe ser un número >= 0');
    }
    if (typeof config.parsing.breakdownTolerancePercent !== 'number' || config.parsing.breakdownTolerancePercent < 0 || config.parsing.breakdownTolerancePercent > 100) {
      errors.push('breakdownTolerancePercent debe ser un número entre 0 y 100');
    }
    if (typeof config.parsing.headerRow !== 'number' || config.parsing.headerRow < 1) {
      errors.push('headerRow debe ser un número >= 1');
    }
  }
  
  // Validar matching
  if (config.matching) {
    if (typeof config.matching.fuzzyThreshold !== 'number' || config.matching.fuzzyThreshold < 1 || config.matching.fuzzyThreshold > 5) {
      errors.push('fuzzyThreshold debe ser un número entre 1 y 5');
    }
    if (!['warn', 'error', 'allow'].includes(config.matching.multiMatchAction)) {
      errors.push('multiMatchAction debe ser warn, error o allow');
    }
  }
  
  // Validar validation
  if (config.validation) {
    if (typeof config.validation.minAUMThreshold !== 'number' || config.validation.minAUMThreshold < 0) {
      errors.push('minAUMThreshold debe ser un número >= 0');
    }
    if (typeof config.validation.maxAUMThreshold !== 'number' || config.validation.maxAUMThreshold <= config.validation.minAUMThreshold) {
      errors.push('maxAUMThreshold debe ser un número > minAUMThreshold');
    }
  }
  
  // Validar processing
  if (config.processing) {
    if (typeof config.processing.batchSize !== 'number' || config.processing.batchSize < 100 || config.processing.batchSize > 10000) {
      errors.push('batchSize debe ser un número entre 100 y 10000');
    }
    if (typeof config.processing.maxRetries !== 'number' || config.processing.maxRetries < 1 || config.processing.maxRetries > 10) {
      errors.push('maxRetries debe ser un número entre 1 y 10');
    }
    if (typeof config.processing.timeoutMs !== 'number' || config.processing.timeoutMs < 30000) {
      errors.push('timeoutMs debe ser un número >= 30000');
    }
  }
  
  // Validar logging
  if (config.logging) {
    if (!['debug', 'info', 'warn', 'error'].includes(config.logging.logLevel)) {
      errors.push('logLevel debe ser debug, info, warn o error');
    }
  }
  
  return errors;
}

/**
 * GET /api/etl/comisiones
 * Consulta fact_commission con filtros
 * 
 * Query params:
 * - desde: fecha inicio (ISO string)
 * - hasta: fecha fin (ISO string)
 * - advisor_id: filtrar por asesor beneficiario
 * - mismatch: solo comisiones con mismatch owner/benef (boolean)
 * - page: número de página (default: 1)
 * - size: tamaño de página (default: 50, max: 250)
 */
router.get('/comisiones', async (req: Request, res: Response) => {
  try {
    const { desde, hasta, advisor_id, mismatch, page = '1', size = '50' } = req.query;
    
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(250, Math.max(1, parseInt(size as string, 10)));
    const offset = (pageNum - 1) * pageSize;
    
    const { db, factCommission, dimClient, dimAdvisor } = await import('@cactus/db');
    const { eq, and, gte, lte, sql } = await import('drizzle-orm');
    
    // Construir filtros
    let whereConditions = [];
    
    if (desde) {
      whereConditions.push(gte(factCommission.fecha, desde as string));
    }
    if (hasta) {
      whereConditions.push(lte(factCommission.fecha, hasta as string));
    }
    if (advisor_id) {
      whereConditions.push(eq(factCommission.idAdvisorBenef, advisor_id as string));
    }
    if (mismatch === 'true') {
      whereConditions.push(eq(factCommission.ownerVsBenefMismatch, true));
    }
    
    const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    
    // Query con joins
    const results = await db()
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
        porcentajeAlloc: factCommission.porcentajeAlloc,
        ownerVsBenefMismatch: factCommission.ownerVsBenefMismatch,
        client: {
          id: dimClient.id,
          comitente: dimClient.comitente,
          cuotapartista: dimClient.cuotapartista,
          cuentaNorm: dimClient.cuentaNorm
        },
        advisorBenef: {
          id: dimAdvisor.id,
          asesorNorm: dimAdvisor.asesorNorm,
          equipo: dimAdvisor.equipo
        }
      })
      .from(factCommission)
      .leftJoin(dimClient, eq(factCommission.idClient, dimClient.id))
      .leftJoin(dimAdvisor, eq(factCommission.idAdvisorBenef, dimAdvisor.id))
      .where(where)
      .limit(pageSize)
      .offset(offset)
      .orderBy(factCommission.fecha);
    
    // Count total
    const [{ count }] = await db()
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(factCommission)
      .where(where);
    
    return res.json({
      data: results,
      pagination: {
        page: pageNum,
        size: pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
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
 * POST /api/etl/create-test-advisors
 * Crea asesores de prueba para testing
 */
router.post('/create-test-advisors', async (req: Request, res: Response) => {
  try {
    const { db, dimAdvisor } = await import('@cactus/db');
    
    const advisors = [
      { nombre: 'Juan Pérez', equipo: 'Equipo A', unidad: 'Unidad 1' },
      { nombre: 'María García', equipo: 'Equipo B', unidad: 'Unidad 2' }
    ];

    const createdAdvisors = [];
    
    for (const advisor of advisors) {
      try {
        const result = await db().insert(dimAdvisor).values({
          asesorNorm: advisor.nombre,
          equipo: advisor.equipo,
          unidad: advisor.unidad
        }).returning();

        createdAdvisors.push(result[0]);
      } catch (error) {
        // Si ya existe, continuar
        console.log(`Asesor ${advisor.nombre} ya existe o error:`, error);
      }
    }

    req.log.info({ advisors: createdAdvisors }, 'Asesores de prueba creados');
    
    return res.json({
      success: true,
      message: `${createdAdvisors.length} asesores creados`,
      advisors: createdAdvisors
    });

  } catch (error) {
    req.log.error({ err: error }, 'Error creando asesores de prueba');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/etl/check-schema
 * Verifica el esquema de una tabla específica
 */
router.post('/check-schema', async (req: Request, res: Response) => {
  try {
    const { db } = await import('@cactus/db');
    const { table } = req.body;
    
    if (!table) {
      return res.status(400).json({
        error: 'Nombre de tabla requerido'
      });
    }
    
    const result = await db().execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = ${table}
      ORDER BY ordinal_position
    `);

    return res.json({
      table,
      columns: result
    });

  } catch (error) {
    req.log.error({ err: error }, 'Error verificando esquema');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/etl/fix-database
 * Arregla la base de datos agregando columnas faltantes
 */
router.post('/fix-database', async (req: Request, res: Response) => {
  try {
    const { db } = await import('@cactus/db');
    
    // Verificar si la columna descubierto_en_madre existe
    const result = await db().execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'dim_client' 
      AND column_name = 'descubierto_en_madre'
    `);

    let addedColumns = [];

    if (result.length === 0) {
      // Agregar la columna
      await db().execute(sql`
        ALTER TABLE dim_client 
        ADD COLUMN descubierto_en_madre boolean DEFAULT false NOT NULL
      `);
      addedColumns.push('descubierto_en_madre');
    }

    // Verificar si la columna descubierto_en_mensual existe
    const result2 = await db().execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'dim_client' 
      AND column_name = 'descubierto_en_mensual'
    `);

    if (result2.length === 0) {
      // Agregar la columna
      await db().execute(sql`
        ALTER TABLE dim_client 
        ADD COLUMN descubierto_en_mensual boolean DEFAULT false NOT NULL
      `);
      addedColumns.push('descubierto_en_mensual');
    }

    req.log.info({ addedColumns }, 'Columnas agregadas a la base de datos');
    
    return res.json({
      success: true,
      message: addedColumns.length > 0 ? `Columnas agregadas: ${addedColumns.join(', ')}` : 'Todas las columnas ya existen',
      addedColumns
    });

  } catch (error) {
    req.log.error({ err: error }, 'Error arreglando base de datos');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/etl/status
 * Obtiene el estado actual de los datos ETL
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { db } = await import('@cactus/db');
    
    // Verificar datos en fact_aum_snapshot
    const snapshotStats = await db().execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN id_advisor_owner IS NOT NULL THEN 1 END) as madres,
        COUNT(CASE WHEN id_advisor_owner IS NULL THEN 1 END) as nuevos
      FROM fact_aum_snapshot
    `);

    // Verificar datos en dim_client
    const clientStats = await db().execute(sql`
      SELECT COUNT(*) as total FROM dim_client
    `);

    // Verificar datos en dim_advisor
    const advisorStats = await db().execute(sql`
      SELECT COUNT(*) as total FROM dim_advisor
    `);

    // Verificar datos en stg_comisiones
    const commissionStats = await db().execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processed = true THEN 1 END) as procesadas
      FROM stg_comisiones
    `);

    return res.json({
      factAumSnapshot: {
        total: snapshotStats[0]?.total || 0,
        madres: snapshotStats[0]?.madres || 0,
        nuevos: snapshotStats[0]?.nuevos || 0
      },
      dimClient: {
        total: clientStats[0]?.total || 0
      },
      dimAdvisor: {
        total: advisorStats[0]?.total || 0
      },
      stgComisiones: {
        total: commissionStats[0]?.total || 0,
        procesadas: commissionStats[0]?.procesadas || 0
      }
    });

  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo estado ETL');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

export default router;

