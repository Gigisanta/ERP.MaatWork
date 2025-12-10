import { Logger } from 'pino';

/**
 * Helper para medir y loguear performance de queries de base de datos
 * Proporciona métricas detalladas para identificar bottlenecks
 */

export interface QueryMetrics {
  operation: string;
  duration: number;
  success: boolean;
  error?: Error;
  rowCount?: number;
  queryType?: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  cacheHit?: boolean;
  nPlusOneDetected?: boolean;
}

/**
 * Track de queries para detección automática de N+1
 * Almacena queries recientes agrupadas por operación base (sin IDs)
 */
interface QueryTrack {
  operationBase: string; // Operación sin IDs (ej: 'get_contact' en lugar de 'get_contact_123')
  timestamp: number;
  duration: number;
}

// Store para trackear queries recientes (últimos 100ms)
const recentQueries: QueryTrack[] = [];
const N1_DETECTION_WINDOW_MS = 100; // Ventana de tiempo para detectar N+1
const N1_DETECTION_THRESHOLD = 5; // Número mínimo de queries similares para alertar

// Store para métricas agregadas de queries (últimas 1000 queries)
export interface AggregatedQueryMetrics {
  operationBase: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  nPlusOneCount: number;
  lastSeen: number;
}

const queryMetrics: Map<string, AggregatedQueryMetrics> = new Map();
const MAX_METRICS_ENTRIES = 1000; // Mantener métricas de últimas 1000 operaciones únicas

/**
 * Extrae el nombre base de una operación (sin IDs)
 * Ej: 'get_contact_abc123' -> 'get_contact'
 */
function extractOperationBase(operation: string): string {
  // Remover IDs al final (UUIDs, números, etc.)
  // Patrón: operación_base_id -> operación_base
  return operation.replace(/_[a-f0-9]{8,}$/i, '').replace(/_\d+$/, '');
}

/**
 * Detecta automáticamente patrones N+1 basado en queries recientes
 * @param operation - Nombre de la operación actual
 * @returns true si se detecta un patrón N+1
 */
function detectNPlusOne(operation: string): boolean {
  const now = Date.now();
  const operationBase = extractOperationBase(operation);

  // Limpiar queries fuera de la ventana de tiempo
  const windowStart = now - N1_DETECTION_WINDOW_MS;
  const recentInWindow = recentQueries.filter((q) => q.timestamp >= windowStart);

  // Contar queries similares en la ventana
  const similarQueries = recentInWindow.filter((q) => q.operationBase === operationBase);

  // Agregar la query actual al track
  recentQueries.push({
    operationBase,
    timestamp: now,
    duration: 0, // Se actualizará después
  });

  // Mantener solo las últimas 100 queries en memoria
  if (recentQueries.length > 100) {
    recentQueries.shift();
  }

  // Detectar N+1: múltiples queries similares en ventana corta
  return similarQueries.length >= N1_DETECTION_THRESHOLD;
}

/**
 * Envuelve una función de query con logging de performance
 *
 * AI_DECISION: Add cache hit/miss tracking and N+1 detection capabilities
 * Justificación: Mejora visibilidad de optimizaciones de caché y detecta problemas N+1
 * Impacto: Mejora monitoreo y debugging de performance issues
 *
 * @param logger - Instancia de logger de pino
 * @param operation - Nombre descriptivo de la operación
 * @param queryFn - Función que ejecuta la query
 * @param queryType - Tipo de query para categorización
 * @param options - Opciones adicionales para métricas (cacheHit, nPlusOneDetected)
 * @returns Resultado de la query con métricas logueadas
 */
export async function loggedQuery<T>(
  logger: Logger,
  operation: string,
  queryFn: () => Promise<T>,
  queryType: QueryMetrics['queryType'] = 'select',
  options?: { cacheHit?: boolean; nPlusOneDetected?: boolean; table?: string }
): Promise<T> {
  const start = Date.now();

  // AI_DECISION: Auto-detect N+1 patterns before executing query
  // Justificación: Detectar automáticamente patrones N+1 permite identificar problemas sin intervención manual
  // Impacto: Mejora visibilidad de problemas de performance, facilita optimización proactiva
  const nPlusOneDetected = options?.nPlusOneDetected ?? detectNPlusOne(operation);

  // Extract table name from operation if not provided
  const table = options?.table || extractTableFromOperation(operation);

  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    const durationSeconds = duration / 1000;

    // Record Prometheus metrics (async, non-blocking)
    import('../metrics')
      .then(({ dbQueryDuration, dbQueriesTotal }) => {
        dbQueryDuration.observe({ operation, table }, durationSeconds);
        dbQueriesTotal.inc({ operation, table });
      })
      .catch(() => {
        // Silently fail metrics
      });

    // Actualizar duración en el track más reciente
    const lastQuery = recentQueries[recentQueries.length - 1];
    if (
      lastQuery &&
      extractOperationBase(lastQuery.operationBase) === extractOperationBase(operation)
    ) {
      lastQuery.duration = duration;
    }

    // Actualizar métricas agregadas
    updateAggregatedMetrics(operation, duration, nPlusOneDetected);

    // Determinar rowCount basado en el tipo de resultado
    let rowCount: number | undefined;
    if (Array.isArray(result)) {
      rowCount = result.length;
    } else if (result && typeof result === 'object' && 'length' in result) {
      rowCount = (result as any).length;
    }

    const metrics: QueryMetrics = {
      operation,
      duration,
      success: true,
      queryType,
      nPlusOneDetected,
    };
    if (rowCount !== undefined) {
      (metrics as any).rowCount = rowCount;
    }
    if (options?.cacheHit !== undefined) {
      metrics.cacheHit = options.cacheHit;
    }

    // Log basado en duración para priorizar queries lentas
    // Warn si es query N+1 detectada o muy lenta
    if (nPlusOneDetected) {
      const operationBase = extractOperationBase(operation);
      logger.warn(
        {
          ...metrics,
          operationBase,
          suggestion: 'Consider using JOINs or batch loading to consolidate queries',
        },
        `N+1 query pattern detected: ${operationBase} (${recentQueries.filter((q) => extractOperationBase(q.operationBase) === operationBase && Date.now() - q.timestamp < N1_DETECTION_WINDOW_MS).length} similar queries in ${N1_DETECTION_WINDOW_MS}ms)`
      );
    } else if (duration > 1000) {
      logger.warn(metrics, 'Slow DB query detected');
    } else if (duration > 500) {
      logger.info(metrics, 'DB query completed (moderate duration)');
    } else {
      logger.debug(metrics, 'DB query completed');
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    const durationSeconds = duration / 1000;

    // Record Prometheus metrics for failed queries (async, non-blocking)
    import('../metrics')
      .then(({ dbQueryDuration, dbQueriesTotal }) => {
        dbQueryDuration.observe({ operation, table }, durationSeconds);
        dbQueriesTotal.inc({ operation, table });
      })
      .catch(() => {
        // Silently fail metrics
      });

    const metrics: QueryMetrics = {
      operation,
      duration,
      success: false,
      error: error as Error,
      queryType,
      nPlusOneDetected,
    };
    if (options?.cacheHit !== undefined) {
      metrics.cacheHit = options.cacheHit;
    }

    logger.error(metrics, 'DB query failed');
    throw error;
  }
}

/**
 * Extract table name from operation string
 * Examples: 'get_contact_123' -> 'contacts', 'list_tasks' -> 'tasks'
 */
function extractTableFromOperation(operation: string): string {
  // Common patterns: get_<table>, list_<table>, create_<table>, update_<table>, delete_<table>
  const match = operation.match(/^(get|list|create|update|delete|find|select)_(\w+)/i);
  if (match && match[2]) {
    // Pluralize if needed (simple heuristic)
    const table = match[2].toLowerCase();
    // Common pluralizations
    if (table.endsWith('y')) {
      return table.slice(0, -1) + 'ies';
    }
    if (!table.endsWith('s')) {
      return table + 's';
    }
    return table;
  }
  return 'unknown';
}

/**
 * Helper específico para queries de Drizzle ORM
 * Detecta automáticamente el tipo de query basado en el método usado
 */
export function createDrizzleLogger(logger: Logger) {
  return {
    /**
     * Loggea una query SELECT
     */
    async select<T>(operation: string, queryFn: () => Promise<T>): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'select');
    },

    /**
     * Loggea una query INSERT
     */
    async insert<T>(operation: string, queryFn: () => Promise<T>): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'insert');
    },

    /**
     * Loggea una query UPDATE
     */
    async update<T>(operation: string, queryFn: () => Promise<T>): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'update');
    },

    /**
     * Loggea una query DELETE
     */
    async delete<T>(operation: string, queryFn: () => Promise<T>): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'delete');
    },

    /**
     * Loggea una query RAW SQL
     */
    async raw<T>(operation: string, queryFn: () => Promise<T>): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'raw');
    },
  };
}

/**
 * Middleware para medir performance de transacciones completas
 * Útil para operaciones que involucran múltiples queries
 */
export async function loggedTransaction<T>(
  logger: Logger,
  operation: string,
  transactionFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await transactionFn();
    const duration = Date.now() - start;

    logger.info(
      {
        operation,
        duration,
        success: true,
        queryType: 'transaction',
      },
      'DB transaction completed'
    );

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    logger.error(
      {
        operation,
        duration,
        success: false,
        error: error as Error,
        queryType: 'transaction',
      },
      'DB transaction failed'
    );

    throw error;
  }
}

/**
 * Crea un nombre de operación seguro para logging
 * Limita la longitud y sanitiza caracteres especiales
 * @param prefix - Prefijo de la operación (ej: 'get_portfolio_template')
 * @param id - ID a incluir en el nombre
 * @param maxIdLength - Longitud máxima del ID a incluir (default: 8)
 * @returns Nombre de operación sanitizado
 */
export function createOperationName(prefix: string, id: string, maxIdLength: number = 8): string {
  // Limitar longitud del ID y sanitizar caracteres especiales
  const sanitizedId = id.substring(0, maxIdLength).replace(/[^a-zA-Z0-9_-]/g, '_');

  return `${prefix}_${sanitizedId}`;
}

/**
 * Actualiza métricas agregadas para una operación
 */
function updateAggregatedMetrics(
  operation: string,
  duration: number,
  nPlusOneDetected: boolean
): void {
  const operationBase = extractOperationBase(operation);
  const now = Date.now();

  let metrics = queryMetrics.get(operationBase);
  if (!metrics) {
    metrics = {
      operationBase,
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: duration,
      maxDuration: duration,
      p95Duration: duration,
      p99Duration: duration,
      nPlusOneCount: 0,
      lastSeen: now,
    };
  }

  // Actualizar métricas
  metrics.count++;
  metrics.totalDuration += duration;
  metrics.avgDuration = metrics.totalDuration / metrics.count;
  metrics.minDuration = Math.min(metrics.minDuration, duration);
  metrics.maxDuration = Math.max(metrics.maxDuration, duration);
  metrics.lastSeen = now;

  if (nPlusOneDetected) {
    metrics.nPlusOneCount++;
  }

  // Calcular percentiles (simplificado: usar array de duraciones recientes)
  // Para una implementación más precisa, usar un algoritmo de percentiles
  const recentDurations = recentQueries
    .filter((q) => extractOperationBase(q.operationBase) === operationBase)
    .map((q) => q.duration)
    .sort((a, b) => a - b);

  if (recentDurations.length > 0) {
    const p95Index = Math.floor(recentDurations.length * 0.95);
    const p99Index = Math.floor(recentDurations.length * 0.99);
    metrics.p95Duration = recentDurations[p95Index] || duration;
    metrics.p99Duration = recentDurations[p99Index] || duration;
  }

  queryMetrics.set(operationBase, metrics);

  // Limitar tamaño del Map
  if (queryMetrics.size > MAX_METRICS_ENTRIES) {
    // Eliminar la entrada más antigua
    const oldest = Array.from(queryMetrics.entries()).sort(
      (a, b) => a[1].lastSeen - b[1].lastSeen
    )[0];
    if (oldest) {
      queryMetrics.delete(oldest[0]);
    }
  }
}

/**
 * Obtiene métricas agregadas de queries para dashboard
 * @returns Array de métricas ordenadas por duración promedio descendente
 */
export function getQueryMetrics(): AggregatedQueryMetrics[] {
  return Array.from(queryMetrics.values()).sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * Obtiene queries lentas (p95 > threshold)
 * @param thresholdMs - Umbral en milisegundos (default: 500)
 * @returns Array de métricas de queries lentas
 */
export function getSlowQueries(thresholdMs: number = 500): AggregatedQueryMetrics[] {
  return getQueryMetrics().filter((m) => m.p95Duration > thresholdMs);
}

/**
 * Obtiene queries con problemas N+1 detectados
 * @returns Array de métricas con N+1 detectado
 */
export function getNPlusOneQueries(): AggregatedQueryMetrics[] {
  return getQueryMetrics().filter((m) => m.nPlusOneCount > 0);
}
