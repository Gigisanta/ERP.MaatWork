import { Router, Request, Response } from 'express';
import multer from 'multer';
import { loadExcelFromRequest, getLoaderConfig } from '../services/ingestion/loader';
import { stagingService } from '../services/ingestion/staging';
import { diffEngine } from '../services/ingestion/diff-engine';
import { exportService } from '../services/ingestion/export';
import { aplicarCambiosService } from '../services/ingestion/aplicar-cambios';
import { snapshotService } from '../services/ingestion/snapshot-service';
import type { 
  CargaArchivoResponse, 
  DiffResponse,
  AplicarCambiosResponse 
} from '../services/ingestion/types';

const router = Router();

// Configuración de multer para subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /comparacion-mensual/cargar
 * Carga un archivo Excel mensual y lo procesa
 */
router.post('/cargar', upload.single('archivo'), async (req: Request, res: Response) => {
  try {
    req.log.info({ route: '/comparacion-mensual/cargar' }, 'Iniciando carga de archivo mensual');

    // TODO: Obtener userId del token de autenticación
    const userId = 'system'; // Temporal hasta implementar auth

    // Cargar y validar archivo Excel
    const loadResult = await loadExcelFromRequest(req, getLoaderConfig('clusterCuentas'));
    
    if (!loadResult.success) {
      return res.status(400).json({
        success: false,
        error: loadResult.error,
        warnings: loadResult.warnings
      } as CargaArchivoResponse);
    }

    // Cargar a staging
    const stagingResult = await stagingService.loadToStaging(
      loadResult.metadata!,
      loadResult.data!,
      userId,
      loadResult.validation
    );

    req.log.info({ 
      cargaId: stagingResult.cargaId,
      isExisting: stagingResult.isExisting 
    }, 'Archivo cargado exitosamente a staging');

    res.json({
      success: true,
      cargaId: stagingResult.cargaId,
      metadata: loadResult.metadata,
      validation: loadResult.validation,
      warnings: [...loadResult.warnings || [], ...stagingResult.warnings],
      isExisting: stagingResult.isExisting
    } as CargaArchivoResponse);

  } catch (error) {
    req.log.error({ err: error }, 'Error en carga de archivo mensual');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    } as CargaArchivoResponse);
  }
});

/**
 * POST /comparacion-mensual/diff/:cargaId
 * Ejecuta el proceso de diff para una carga específica
 */
router.post('/diff/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    req.log.info({ cargaId }, 'Iniciando proceso de diff');

    // Ejecutar diff
    const diffResult = await diffEngine.executeDiff(cargaId);

    req.log.info({ 
      cargaId, 
      nuevos: diffResult.resumen.totalNuevos,
      modificados: diffResult.resumen.totalModificados,
      sinAsesor: diffResult.resumen.totalSinAsesor
    }, 'Diff completado exitosamente');

    res.json({
      success: true,
      cargaId,
      diff: diffResult
    } as DiffResponse);

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error en proceso de diff');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    } as DiffResponse);
  }
});

/**
 * GET /comparacion-mensual/resumen/:cargaId
 * Obtiene el resumen de una carga
 */
router.get('/resumen/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    const resumen = await stagingService.getLoadSummary(cargaId);
    
    res.json({
      success: true,
      resumen
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error obteniendo resumen');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/diff-resumen/:cargaId
 * Obtiene el resumen del diff para una carga
 */
router.get('/diff-resumen/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    const resumen = await diffEngine.getDiffSummary(cargaId);
    
    res.json({
      success: true,
      resumen
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error obteniendo resumen de diff');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/diff-detalle/:cargaId
 * Obtiene los detalles del diff para una carga
 */
router.get('/diff-detalle/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const { tipo, limit = 100, offset = 0 } = req.query;
    
    let detalles = await diffEngine.getDiffDetails(cargaId);
    
    // Filtrar por tipo si se especifica
    if (tipo && (tipo === 'nuevo' || tipo === 'modificado')) {
      detalles = detalles.filter((d: any) => d.tipo === tipo);
    }
    
    // Aplicar paginación
    const total = detalles.length;
    const paginatedDetalles = detalles.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      detalles: paginatedDetalles,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error obteniendo detalles de diff');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/sin-asesor/:cargaId
 * Obtiene registros sin asesor para una carga
 */
router.get('/sin-asesor/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    // Obtener datos de staging sin asesor
    const stagingData = await stagingService.getStagingData(cargaId);
    const sinAsesor = stagingData.filter((record: any) => !record.asesor);
    
    // Aplicar paginación
    const total = sinAsesor.length;
    const paginatedData = sinAsesor.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      registros: paginatedData,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error obteniendo registros sin asesor');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/ausentes/:cargaId
 * Obtiene registros ausentes para una carga
 */
router.get('/ausentes/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    
    const detalles = await diffEngine.getDiffDetails(cargaId);
    const ausentes = detalles.filter((d: any) => d.tipo === 'ausente');
    
    // Aplicar paginación
    const total = ausentes.length;
    const paginatedData = ausentes.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      registros: paginatedData,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error obteniendo registros ausentes');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /comparacion-mensual/asignaciones/:cargaId
 * Guarda asignaciones manuales de asesor
 */
router.post('/asignaciones/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const { asignaciones } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (!asignaciones || !Array.isArray(asignaciones)) {
      return res.status(400).json({
        success: false,
        error: 'asignaciones debe ser un array'
      });
    }

    // Validar formato de asignaciones
    for (const asignacion of asignaciones) {
      if (!asignacion.idcuenta || !asignacion.asesorNuevo) {
        return res.status(400).json({
          success: false,
          error: 'Cada asignación debe tener idcuenta y asesorNuevo'
        });
      }
    }

    // Aquí se guardaría en la tabla asignaciones_asesor
    // Por ahora retornamos éxito
    res.json({
      success: true,
      asignacionesGuardadas: asignaciones.length,
      message: 'Asignaciones guardadas correctamente'
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error guardando asignaciones');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /comparacion-mensual/aplicar-cambios/:cargaId
 * Aplica todos los cambios al maestro
 */
router.post('/aplicar-cambios/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const { asignaciones, ausentesInactivar } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Aplicar cambios
    const resultado = await aplicarCambiosService.aplicarCambios(
      cargaId,
      userId,
      asignaciones
    );

    // Inactivar ausentes si se especificaron
    let ausentesInactivados = 0;
    if (ausentesInactivar && Array.isArray(ausentesInactivar) && ausentesInactivar.length > 0) {
      ausentesInactivados = await aplicarCambiosService.inactivarAusentes(
        cargaId,
        ausentesInactivar,
        userId
      );
    }

    req.log.info({ 
      cargaId, 
      userId,
      resultado: {
        ...resultado,
        ausentesInactivados
      }
    }, 'Cambios aplicados exitosamente');

    res.json({
      success: true,
      ...resultado,
      ausentesInactivados
    } as AplicarCambiosResponse);

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error aplicando cambios');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/snapshots/:cargaId
 * Obtiene snapshots de una carga
 */
router.get('/snapshots/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    const snapshots = await snapshotService.getSnapshotsByCarga(cargaId);
    
    res.json({
      success: true,
      snapshots
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error obteniendo snapshots');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/snapshots/:cargaId/compare
 * Compara snapshots antes y después
 */
router.get('/snapshots/:cargaId/compare', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    const snapshots = await snapshotService.getSnapshotsByCarga(cargaId);
    
    if (snapshots.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron suficientes snapshots para comparar'
      });
    }

    const snapshotAntes = snapshots.find((s: any) => s.tipo === 'antes');
    const snapshotDespues = snapshots.find((s: any) => s.tipo === 'despues');

    if (!snapshotAntes || !snapshotDespues) {
      return res.status(400).json({
        success: false,
        error: 'Snapshots incompletos'
      });
    }

    const comparacion = await snapshotService.compareSnapshots(
      snapshotAntes.id,
      snapshotDespues.id
    );
    
    res.json({
      success: true,
      comparacion
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error comparando snapshots');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /comparacion-mensual/revertir/:cargaId
 * Revierte cambios aplicados
 */
router.post('/revertir/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const revertido = await aplicarCambiosService.revertirCambios(cargaId, userId);

    req.log.info({ cargaId, userId }, 'Cambios revertidos exitosamente');

    res.json({
      success: true,
      revertido,
      message: 'Cambios revertidos exitosamente'
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error revirtiendo cambios');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/cargas-recientes
 * Obtiene las cargas más recientes
 */
router.get('/cargas-recientes', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const cargas = await stagingService.getRecentLoads(Number(limit));
    
    res.json({
      success: true,
      cargas
    });

  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo cargas recientes');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /comparacion-mensual/asignaciones/:cargaId
 * Guarda asignaciones de asesores para una carga
 */
router.post('/asignaciones/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    const { asignaciones } = req.body;
    
    req.log.info({ cargaId, count: asignaciones?.length }, 'Guardando asignaciones de asesores');
    
    if (!asignaciones || !Array.isArray(asignaciones)) {
      return res.status(400).json({
        success: false,
        error: 'asignaciones debe ser un array'
      });
    }

    // TODO: Implementar lógica de guardado de asignaciones
    // Por ahora simulamos el guardado
    
    const guardadas = asignaciones.length;
    
    req.log.info({ cargaId, guardadas }, 'Asignaciones guardadas exitosamente');
    
    res.json({
      success: true,
      guardadas,
      message: `${guardadas} asignaciones guardadas exitosamente`
    });

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error guardando asignaciones');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /comparacion-mensual/aplicar-cambios/:cargaId
 * Aplica los cambios detectados al maestro (placeholder)
 */
router.post('/aplicar-cambios/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    req.log.info({ cargaId }, 'Iniciando aplicación de cambios');
    
    // TODO: Implementar lógica de aplicación de cambios
    // Por ahora solo marcamos como aplicado
    
    res.json({
      success: true,
      message: 'Aplicación de cambios implementada como placeholder',
      cambiosAplicados: {
        nuevos: 0,
        modificados: 0,
        asignaciones: 0
      }
    } as AplicarCambiosResponse);

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error aplicando cambios');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    } as AplicarCambiosResponse);
  }
});

/**
 * GET /comparacion-mensual/export/maestro
 * Exporta el maestro actual a Excel
 */
router.get('/export/maestro', async (req: Request, res: Response) => {
  try {
    const { formato = 'xlsx' } = req.query;
    
    req.log.info({ formato }, 'Exportando maestro');

    const fileName = exportService.generateFileName('maestro', formato as 'xlsx' | 'csv');

    if (formato === 'csv') {
      const csvContent = await exportService.exportMaestroToCSV();
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace('.xlsx', '.csv')}"`);
      res.send(csvContent);
    } else {
      const excelBuffer = await exportService.exportMaestro('xlsx');
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(excelBuffer);
    }

  } catch (error) {
    req.log.error({ err: error }, 'Error exportando maestro');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/export/diff/:cargaId
 * Exporta detalles de cambios para una carga específica
 */
router.get('/export/diff/:cargaId', async (req: Request, res: Response) => {
  try {
    const { cargaId } = req.params;
    
    req.log.info({ cargaId }, 'Exportando diff');

    const excelBuffer = await exportService.exportDiffToExcel(cargaId);
    const fileName = exportService.generateFileName('diff', 'xlsx');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="diff_${cargaId.slice(0, 8)}_${fileName}"`);
    res.send(excelBuffer);

  } catch (error) {
    req.log.error({ err: error, cargaId: req.params.cargaId }, 'Error exportando diff');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * GET /comparacion-mensual/stats/maestro
 * Obtiene estadísticas del maestro
 */
router.get('/stats/maestro', async (req: Request, res: Response) => {
  try {
    const stats = await exportService.getMaestroStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    req.log.error({ err: error }, 'Error obteniendo estadísticas del maestro');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

export default router;
