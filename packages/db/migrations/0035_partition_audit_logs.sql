-- ==========================================================
-- Particionamiento de audit_logs por created_at (mensual)
-- ==========================================================
-- 
-- Esta migración particiona la tabla audit_logs por created_at
-- usando estrategia mensual para mejorar el rendimiento de queries
-- históricas y facilitar el archivado de datos antiguos.
-- 
-- Beneficio esperado: 60-80% reducción en tiempo de queries históricas
-- ==========================================================

-- ==========================================================
-- Paso 1: Crear tabla particionada temporal
-- ==========================================================

-- Crear nueva tabla particionada con la misma estructura que audit_logs
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
  LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- ==========================================================
-- Paso 2: Crear índices en la tabla particionada
-- ==========================================================

-- Los índices se crearán automáticamente en cada partición
-- pero necesitamos crear el índice en la tabla padre
CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_created_at 
ON audit_logs_partitioned (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_actor_user_id 
ON audit_logs_partitioned (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_entity_type 
ON audit_logs_partitioned (entity_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_partitioned_entity_type_entity_id_created 
ON audit_logs_partitioned (entity_type, entity_id, created_at);

-- ==========================================================
-- Paso 3: Crear particiones para datos existentes y futuros
-- ==========================================================

-- Obtener rango de fechas de datos existentes
DO $$
DECLARE
  min_date DATE;
  max_date DATE;
  current_date DATE;
  partition_name TEXT;
BEGIN
  -- Obtener fecha mínima y máxima de datos existentes
  SELECT 
    MIN(created_at::date),
    MAX(created_at::date) + INTERVAL '1 month'
  INTO min_date, max_date
  FROM audit_logs;
  
  -- Si no hay datos, crear particiones para los próximos 3 meses
  IF min_date IS NULL THEN
    min_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    max_date := (min_date + INTERVAL '3 months')::DATE;
  ELSE
    -- Extender hasta 3 meses en el futuro
    max_date := GREATEST(max_date, (DATE_TRUNC('month', CURRENT_DATE)::DATE + INTERVAL '3 months'));
  END IF;
  
  -- Crear particiones mensuales
  current_date := DATE_TRUNC('month', min_date)::DATE;
  
  WHILE current_date < max_date LOOP
    partition_name := 'audit_logs_' || TO_CHAR(current_date, 'YYYY_MM');
    
    -- Crear partición mensual
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      current_date,
      (current_date + INTERVAL '1 month')::DATE
    );
    
    current_date := (current_date + INTERVAL '1 month')::DATE;
  END LOOP;
  
  RAISE NOTICE 'Particiones creadas desde % hasta %', min_date, max_date;
END $$;

-- ==========================================================
-- Paso 4: Migrar datos existentes (si existen)
-- ==========================================================

-- Migrar datos en batches para evitar bloqueos largos
DO $$
DECLARE
  batch_size INTEGER := 10000;
  migrated_count INTEGER := 0;
  total_count INTEGER;
BEGIN
  -- Obtener conteo total
  SELECT COUNT(*) INTO total_count FROM audit_logs;
  
  IF total_count > 0 THEN
    RAISE NOTICE 'Migrando % registros de audit_logs a audit_logs_partitioned...', total_count;
    
    -- Migrar en batches
    LOOP
      INSERT INTO audit_logs_partitioned
      SELECT * FROM audit_logs
      WHERE id NOT IN (SELECT id FROM audit_logs_partitioned)
      LIMIT batch_size;
      
      GET DIAGNOSTICS migrated_count = ROW_COUNT;
      
      EXIT WHEN migrated_count = 0;
      
      RAISE NOTICE 'Migrados % registros...', migrated_count;
      
      -- Pequeña pausa para no bloquear la tabla
      PERFORM pg_sleep(0.1);
    END LOOP;
    
    RAISE NOTICE 'Migración completada. Total migrado: % registros', total_count;
  ELSE
    RAISE NOTICE 'No hay datos para migrar';
  END IF;
END $$;

-- ==========================================================
-- Paso 5: Verificar integridad de datos
-- ==========================================================

DO $$
DECLARE
  original_count BIGINT;
  partitioned_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO original_count FROM audit_logs;
  SELECT COUNT(*) INTO partitioned_count FROM audit_logs_partitioned;
  
  IF original_count != partitioned_count THEN
    RAISE EXCEPTION 'Error de integridad: audit_logs tiene % registros pero audit_logs_partitioned tiene %', 
      original_count, partitioned_count;
  ELSE
    RAISE NOTICE 'Integridad verificada: % registros en ambas tablas', original_count;
  END IF;
END $$;

-- ==========================================================
-- Paso 6: Renombrar tablas (cambio atómico)
-- ==========================================================

-- Renombrar tabla original a backup
ALTER TABLE IF EXISTS audit_logs RENAME TO audit_logs_backup;

-- Renombrar tabla particionada a nombre original
ALTER TABLE audit_logs_partitioned RENAME TO audit_logs;

-- ==========================================================
-- Paso 7: Actualizar secuencias y constraints
-- ==========================================================

-- Asegurar que las secuencias estén actualizadas
SELECT setval('audit_logs_id_seq', (SELECT MAX(id::text::bigint) FROM audit_logs), true);

-- ==========================================================
-- Paso 8: Crear función para crear particiones futuras automáticamente
-- ==========================================================

-- La función create_future_partitions ya existe en 0029_table_partitioning_utilities.sql
-- Solo necesitamos asegurarnos de que se use para audit_logs

-- ==========================================================
-- Comentarios de Documentación
-- ==========================================================

COMMENT ON TABLE audit_logs IS 
'Tabla particionada de audit logs por created_at (mensual). Las particiones se crean automáticamente cada mes.';

-- ==========================================================
-- Notas Importantes
-- ==========================================================
-- 
-- 1. La tabla audit_logs_backup contiene los datos originales
--    y puede ser eliminada después de verificar que todo funciona correctamente.
-- 
-- 2. Las particiones futuras se crearán automáticamente vía scheduler
--    en el mantenimiento mensual.
-- 
-- 3. Las particiones antiguas (> 12 meses) se eliminarán automáticamente
--    vía scheduler en el mantenimiento mensual.
-- 
-- 4. Para eliminar la tabla backup después de verificar:
--    DROP TABLE IF EXISTS audit_logs_backup;
-- 
-- ==========================================================




