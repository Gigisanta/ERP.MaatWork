/**
 * Configuración centralizada de timeouts
 * 
 * AI_DECISION: Reemplazar magic numbers con configuración dinámica
 * Justificación: Permite ajustar timeouts por entorno sin redeployar
 * Impacto: Mejor mantenibilidad y escalabilidad
 */

/**
 * Timeouts para operaciones de portfolio/analytics
 */
export const TIMEOUTS = {
  // Timeout base para operaciones simples de portfolio
  PORTFOLIO_PERFORMANCE: parseInt(
    process.env.PORTFOLIO_PERFORMANCE_TIMEOUT || '60000',
    10
  ), // Default: 60s

  // Timeout base para comparaciones
  PORTFOLIO_COMPARE_BASE: parseInt(
    process.env.PORTFOLIO_COMPARE_BASE_TIMEOUT || '30000',
    10
  ), // Default: 30s

  // Timeout adicional por cada item en comparación
  PORTFOLIO_COMPARE_PER_ITEM: parseInt(
    process.env.PORTFOLIO_COMPARE_PER_ITEM_TIMEOUT || '5000',
    10
  ), // Default: 5s por item

  // Timeout máximo absoluto para comparaciones
  PORTFOLIO_COMPARE_MAX: parseInt(
    process.env.PORTFOLIO_COMPARE_MAX_TIMEOUT || '120000',
    10
  ), // Default: 120s

  // Timeout para operaciones de fetch de Python service
  PYTHON_SERVICE_DEFAULT: parseInt(
    process.env.PYTHON_SERVICE_TIMEOUT || '30000',
    10
  ), // Default: 30s

  // Timeout para búsqueda de instrumentos
  INSTRUMENT_SEARCH: parseInt(
    process.env.INSTRUMENT_SEARCH_TIMEOUT || '10000',
    10
  ), // Default: 10s

  // Timeout para backfill de precios
  PRICE_BACKFILL: parseInt(
    process.env.PRICE_BACKFILL_TIMEOUT || '300000',
    10
  ), // Default: 5 min
} as const;

/**
 * Calcular timeout dinámico basado en cantidad de items
 */
export function calculateDynamicTimeout(
  baseTimeout: number,
  itemCount: number,
  perItemTimeout: number,
  maxTimeout?: number
): number {
  const calculated = baseTimeout + itemCount * perItemTimeout;

  if (maxTimeout && calculated > maxTimeout) {
    return maxTimeout;
  }

  return calculated;
}

/**
 * Calcular timeout para comparación de portfolios
 */
export function getPortfolioCompareTimeout(portfolioCount: number, benchmarkCount: number): number {
  const totalItems = portfolioCount + benchmarkCount;

  return calculateDynamicTimeout(
    TIMEOUTS.PORTFOLIO_COMPARE_BASE,
    totalItems,
    TIMEOUTS.PORTFOLIO_COMPARE_PER_ITEM,
    TIMEOUTS.PORTFOLIO_COMPARE_MAX
  );
}

/**
 * Validar que los timeouts estén en rangos razonables
 */
export function validateTimeouts(): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Verificar timeouts mínimos
  if (TIMEOUTS.PORTFOLIO_PERFORMANCE < 5000) {
    warnings.push('PORTFOLIO_PERFORMANCE_TIMEOUT is very low (< 5s), may cause failures');
  }

  if (TIMEOUTS.PORTFOLIO_COMPARE_BASE < 10000) {
    warnings.push('PORTFOLIO_COMPARE_BASE_TIMEOUT is very low (< 10s), may cause failures');
  }

  // Verificar timeouts máximos
  if (TIMEOUTS.PORTFOLIO_COMPARE_MAX > 300000) {
    warnings.push('PORTFOLIO_COMPARE_MAX_TIMEOUT is very high (> 5min), may cause resource issues');
  }

  if (TIMEOUTS.PRICE_BACKFILL > 600000) {
    warnings.push('PRICE_BACKFILL_TIMEOUT is very high (> 10min), consider splitting into batches');
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

// Validar al inicializar
// AI_DECISION: Usar logger estructurado en lugar de console.warn
// Justificación: Mejor observabilidad en producción
// Impacto: Warnings de configuración se registran en logs estructurados
if (process.env.NODE_ENV !== 'test') {
  const validation = validateTimeouts();
  if (!validation.valid) {
    // Importar logger solo si hay warnings (lazy import para evitar ciclos)
    import('../index.js').then(({ logger }) => {
      logger.warn({ warnings: validation.warnings }, 'Timeout configuration warnings detected');
    }).catch(() => {
      // Fallback a console.warn si logger no está disponible (durante inicialización)
      console.warn('⚠️  Timeout configuration warnings:', validation.warnings);
    });
  }
}
