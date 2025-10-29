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
}

/**
 * Envuelve una función de query con logging de performance
 * @param logger - Instancia de logger de pino
 * @param operation - Nombre descriptivo de la operación
 * @param queryFn - Función que ejecuta la query
 * @param queryType - Tipo de query para categorización
 * @returns Resultado de la query con métricas logueadas
 */
export async function loggedQuery<T>(
  logger: Logger,
  operation: string,
  queryFn: () => Promise<T>,
  queryType: QueryMetrics['queryType'] = 'select'
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
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
      queryType
    };
    if (rowCount !== undefined) {
      (metrics as any).rowCount = rowCount;
    }
    
    // Log basado en duración para priorizar queries lentas
    if (duration > 1000) {
      logger.warn(metrics, 'Slow DB query detected');
    } else if (duration > 500) {
      logger.info(metrics, 'DB query completed (moderate duration)');
    } else {
      logger.debug(metrics, 'DB query completed');
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    const metrics: QueryMetrics = {
      operation,
      duration,
      success: false,
      error: error as Error,
      queryType
    };
    
    logger.error(metrics, 'DB query failed');
    throw error;
  }
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
    async select<T>(
      operation: string,
      queryFn: () => Promise<T>
    ): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'select');
    },

    /**
     * Loggea una query INSERT
     */
    async insert<T>(
      operation: string,
      queryFn: () => Promise<T>
    ): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'insert');
    },

    /**
     * Loggea una query UPDATE
     */
    async update<T>(
      operation: string,
      queryFn: () => Promise<T>
    ): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'update');
    },

    /**
     * Loggea una query DELETE
     */
    async delete<T>(
      operation: string,
      queryFn: () => Promise<T>
    ): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'delete');
    },

    /**
     * Loggea una query RAW SQL
     */
    async raw<T>(
      operation: string,
      queryFn: () => Promise<T>
    ): Promise<T> {
      return loggedQuery(logger, operation, queryFn, 'raw');
    }
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
    
    logger.info({
      operation,
      duration,
      success: true,
      queryType: 'transaction'
    }, 'DB transaction completed');
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    logger.error({
      operation,
      duration,
      success: false,
      error: error as Error,
      queryType: 'transaction'
    }, 'DB transaction failed');
    
    throw error;
  }
}
