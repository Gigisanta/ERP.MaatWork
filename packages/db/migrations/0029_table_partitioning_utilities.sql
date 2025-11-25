-- ==========================================================
-- Utilidades para Particionamiento de Tablas
-- ==========================================================
-- 
-- Este archivo crea funciones auxiliares para gestionar
-- particionamiento de tablas grandes por rango de fecha.
-- 
-- NOTA: El particionamiento real debe ser evaluado primero
-- usando el script: scripts/evaluate-table-partitioning.ts
-- 
-- Tablas candidatas:
-- - broker_transactions (por trade_date)
-- - broker_positions (por as_of_date)
-- - activity_events (por occurred_at)
-- - aum_snapshots (por date)
-- ==========================================================

-- ==========================================================
-- Función: Crear partición mensual
-- ==========================================================
-- Crea una partición mensual para una tabla particionada por rango de fecha
-- 
-- Uso:
--   SELECT create_monthly_partition('broker_transactions', '2024-01-01'::date);
-- ==========================================================

CREATE OR REPLACE FUNCTION create_monthly_partition(
  parent_table TEXT,
  partition_start DATE
) RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  partition_end DATE;
BEGIN
  -- Calcular nombre y fecha fin de la partición
  partition_name := parent_table || '_' || TO_CHAR(partition_start, 'YYYY_MM');
  partition_end := (partition_start + INTERVAL '1 month')::DATE;
  
  -- Crear partición si no existe
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    parent_table,
    partition_start,
    partition_end
  );
  
  RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Crear partición trimestral
-- ==========================================================
-- Crea una partición trimestral para una tabla particionada por rango de fecha
-- 
-- Uso:
--   SELECT create_quarterly_partition('broker_transactions', '2024-01-01'::date);
-- ==========================================================

CREATE OR REPLACE FUNCTION create_quarterly_partition(
  parent_table TEXT,
  partition_start DATE
) RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  partition_end DATE;
BEGIN
  -- Calcular nombre y fecha fin de la partición (trimestre)
  partition_name := parent_table || '_' || TO_CHAR(partition_start, 'YYYY') || '_Q' || 
                    TO_CHAR(partition_start, 'Q');
  partition_end := (DATE_TRUNC('quarter', partition_start) + INTERVAL '3 months')::DATE;
  
  -- Crear partición si no existe
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    parent_table,
    partition_start,
    partition_end
  );
  
  RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Crear particiones para un rango de fechas
-- ==========================================================
-- Crea múltiples particiones (mensuales o trimestrales) para un rango de fechas
-- 
-- Uso:
--   SELECT create_partitions_for_range('broker_transactions', '2024-01-01'::date, '2024-12-31'::date, 'monthly');
-- ==========================================================

CREATE OR REPLACE FUNCTION create_partitions_for_range(
  parent_table TEXT,
  start_date DATE,
  end_date DATE,
  strategy TEXT DEFAULT 'monthly'
) RETURNS INTEGER AS $$
DECLARE
  current_date DATE;
  partition_count INTEGER := 0;
  partition_name TEXT;
BEGIN
  current_date := start_date;
  
  WHILE current_date <= end_date LOOP
    IF strategy = 'monthly' THEN
      partition_name := create_monthly_partition(parent_table, current_date);
      current_date := (DATE_TRUNC('month', current_date) + INTERVAL '1 month')::DATE;
    ELSIF strategy = 'quarterly' THEN
      partition_name := create_quarterly_partition(parent_table, current_date);
      current_date := (DATE_TRUNC('quarter', current_date) + INTERVAL '3 months')::DATE;
    ELSE
      RAISE EXCEPTION 'Invalid strategy: %. Must be "monthly" or "quarterly"', strategy;
    END IF;
    
    partition_count := partition_count + 1;
  END LOOP;
  
  RETURN partition_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Crear particiones futuras automáticamente
-- ==========================================================
-- Crea particiones para los próximos N meses/trimestres
-- Útil para mantenimiento automático
-- 
-- Uso:
--   SELECT create_future_partitions('broker_transactions', 3, 'monthly');
-- ==========================================================

CREATE OR REPLACE FUNCTION create_future_partitions(
  parent_table TEXT,
  months_ahead INTEGER DEFAULT 3,
  strategy TEXT DEFAULT 'monthly'
) RETURNS INTEGER AS $$
DECLARE
  start_date DATE;
  end_date DATE;
BEGIN
  -- Calcular rango de fechas futuras
  start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  IF strategy = 'monthly' THEN
    end_date := (start_date + (months_ahead || ' months')::INTERVAL)::DATE;
  ELSIF strategy = 'quarterly' THEN
    start_date := DATE_TRUNC('quarter', CURRENT_DATE)::DATE;
    end_date := (start_date + (months_ahead || ' months')::INTERVAL)::DATE;
  ELSE
    RAISE EXCEPTION 'Invalid strategy: %. Must be "monthly" or "quarterly"', strategy;
  END IF;
  
  RETURN create_partitions_for_range(parent_table, start_date, end_date, strategy);
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Listar particiones de una tabla
-- ==========================================================
-- Retorna información sobre las particiones de una tabla particionada
-- 
-- Uso:
--   SELECT * FROM list_table_partitions('broker_transactions');
-- ==========================================================

CREATE OR REPLACE FUNCTION list_table_partitions(
  parent_table TEXT
) RETURNS TABLE (
  partition_name TEXT,
  partition_start DATE,
  partition_end DATE,
  row_count BIGINT,
  table_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT AS partition_name,
    pg_get_expr(c.relpartbound, c.oid)::TEXT AS partition_bound,
    (SELECT COUNT(*) FROM pg_catalog.pg_class WHERE relname = c.relname)::BIGINT AS row_count,
    pg_size_pretty(pg_total_relation_size(c.oid))::TEXT AS table_size
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_inherits i ON c.oid = i.inhrelid
  JOIN pg_catalog.pg_class p ON i.inhparent = p.oid
  WHERE p.relname = parent_table
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Función: Eliminar partición antigua
-- ==========================================================
-- Elimina una partición específica (útil para archivado)
-- 
-- Uso:
--   SELECT drop_old_partition('broker_transactions_2023_01');
-- ==========================================================

CREATE OR REPLACE FUNCTION drop_old_partition(
  partition_name TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- Comentarios de Documentación
-- ==========================================================

COMMENT ON FUNCTION create_monthly_partition IS 
'Crea una partición mensual para una tabla particionada por rango de fecha';

COMMENT ON FUNCTION create_quarterly_partition IS 
'Crea una partición trimestral para una tabla particionada por rango de fecha';

COMMENT ON FUNCTION create_partitions_for_range IS 
'Crea múltiples particiones para un rango de fechas (mensuales o trimestrales)';

COMMENT ON FUNCTION create_future_partitions IS 
'Crea particiones futuras automáticamente para los próximos N meses/trimestres';

COMMENT ON FUNCTION list_table_partitions IS 
'Lista información sobre las particiones de una tabla particionada';

COMMENT ON FUNCTION drop_old_partition IS 
'Elimina una partición específica (útil para archivado de datos antiguos)';

