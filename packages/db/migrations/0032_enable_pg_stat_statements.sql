-- ==========================================================
-- Habilitar pg_stat_statements y Funciones Helper
-- ==========================================================
-- 
-- Habilita la extensión pg_stat_statements para monitoreo de performance
-- de queries y crea funciones helper para consultar estadísticas.
-- 
-- Requisitos:
-- - shared_preload_libraries debe incluir 'pg_stat_statements' en postgresql.conf
-- - Reiniciar PostgreSQL después de habilitar la extensión
-- 
-- Impacto esperado:
-- - Visibilidad completa de queries lentas
-- - Detección proactiva de problemas de performance
-- - Alertas automáticas para queries > 1 segundo
-- ==========================================================

-- Habilitar extensión pg_stat_statements
-- Nota: Requiere que shared_preload_libraries incluya 'pg_stat_statements'
-- en postgresql.conf y reinicio de PostgreSQL
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ==========================================================
-- Función: Obtener queries lentas
-- ==========================================================
-- Retorna las queries más lentas ordenadas por tiempo total de ejecución
-- 
-- Parámetros:
--   - threshold_ms: Umbral mínimo de tiempo promedio en milisegundos (default: 1000)
--   - limit_count: Número máximo de resultados (default: 20)
-- 
-- Uso:
--   SELECT * FROM get_slow_queries(1000, 20);
-- ==========================================================

CREATE OR REPLACE FUNCTION get_slow_queries(
  threshold_ms DOUBLE PRECISION DEFAULT 1000,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_exec_time DOUBLE PRECISION,
  mean_exec_time DOUBLE PRECISION,
  max_exec_time DOUBLE PRECISION,
  min_exec_time DOUBLE PRECISION,
  stddev_exec_time DOUBLE PRECISION,
  rows BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_stat_statements.query::TEXT,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time,
    pg_stat_statements.mean_exec_time,
    pg_stat_statements.max_exec_time,
    pg_stat_statements.min_exec_time,
    pg_stat_statements.stddev_exec_time,
    pg_stat_statements.rows
  FROM pg_stat_statements
  WHERE pg_stat_statements.mean_exec_time >= threshold_ms
    AND pg_stat_statements.query NOT LIKE '%pg_stat_statements%'
    AND pg_stat_statements.query NOT LIKE '%get_slow_queries%'
  ORDER BY pg_stat_statements.total_exec_time DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Obtener queries más frecuentes
-- ==========================================================
-- Retorna las queries más frecuentemente ejecutadas
-- 
-- Parámetros:
--   - limit_count: Número máximo de resultados (default: 20)
-- 
-- Uso:
--   SELECT * FROM get_most_frequent_queries(20);
-- ==========================================================

CREATE OR REPLACE FUNCTION get_most_frequent_queries(
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_exec_time DOUBLE PRECISION,
  mean_exec_time DOUBLE PRECISION,
  rows BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pg_stat_statements.query::TEXT,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time,
    pg_stat_statements.mean_exec_time,
    pg_stat_statements.rows
  FROM pg_stat_statements
  WHERE pg_stat_statements.query NOT LIKE '%pg_stat_statements%'
    AND pg_stat_statements.query NOT LIKE '%get_%'
  ORDER BY pg_stat_statements.calls DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Obtener queries por tiempo total
-- ==========================================================
-- Retorna las queries que consumen más tiempo total
-- 
-- Parámetros:
--   - limit_count: Número máximo de resultados (default: 20)
-- 
-- Uso:
--   SELECT * FROM get_queries_by_total_time(20);
-- ==========================================================

CREATE OR REPLACE FUNCTION get_queries_by_total_time(
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_exec_time DOUBLE PRECISION,
  mean_exec_time DOUBLE PRECISION,
  percentage_total_time DOUBLE PRECISION,
  rows BIGINT
) AS $$
DECLARE
  total_time DOUBLE PRECISION;
BEGIN
  -- Calcular tiempo total de todas las queries
  SELECT COALESCE(SUM(total_exec_time), 0) INTO total_time
  FROM pg_stat_statements
  WHERE query NOT LIKE '%pg_stat_statements%'
    AND query NOT LIKE '%get_%';

  RETURN QUERY
  SELECT
    pg_stat_statements.query::TEXT,
    pg_stat_statements.calls,
    pg_stat_statements.total_exec_time,
    pg_stat_statements.mean_exec_time,
    CASE 
      WHEN total_time > 0 THEN 
        (pg_stat_statements.total_exec_time / total_time * 100)
      ELSE 0
    END AS percentage_total_time,
    pg_stat_statements.rows
  FROM pg_stat_statements
  WHERE pg_stat_statements.query NOT LIKE '%pg_stat_statements%'
    AND pg_stat_statements.query NOT LIKE '%get_%'
  ORDER BY pg_stat_statements.total_exec_time DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Resetear estadísticas de pg_stat_statements
-- ==========================================================
-- Resetea todas las estadísticas de pg_stat_statements
-- 
-- Uso:
--   SELECT reset_pg_stat_statements();
-- 
-- Advertencia: Solo ejecutar en desarrollo o cuando se necesite
-- reiniciar el monitoreo desde cero
-- ==========================================================

CREATE OR REPLACE FUNCTION reset_pg_stat_statements()
RETURNS void AS $$
BEGIN
  PERFORM pg_stat_statements_reset();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- Comentarios de Documentación
-- ==========================================================

COMMENT ON FUNCTION get_slow_queries IS 
'Retorna las queries más lentas ordenadas por tiempo total de ejecución';

COMMENT ON FUNCTION get_most_frequent_queries IS 
'Retorna las queries más frecuentemente ejecutadas';

COMMENT ON FUNCTION get_queries_by_total_time IS 
'Retorna las queries que consumen más tiempo total con porcentaje del tiempo total';

COMMENT ON FUNCTION reset_pg_stat_statements IS 
'Resetea todas las estadísticas de pg_stat_statements (solo para desarrollo)';

