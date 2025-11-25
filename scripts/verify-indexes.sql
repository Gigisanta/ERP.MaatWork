-- Script SQL para verificar uso de índices en queries críticas
-- Ejecutar con: psql $DATABASE_URL -f scripts/verify-indexes.sql

-- ==========================================================
-- 1. Verificar índices no utilizados
-- ==========================================================
\echo '📊 Verificando índices no utilizados...'
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ==========================================================
-- 2. Verificar uso de índices específicos agregados
-- ==========================================================
\echo ''
\echo '📊 Verificando uso de índices nuevos agregados...'
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_contacts_advisor_deleted_updated',
  'idx_tasks_open_by_user',
  'idx_notes_contact_created_desc',
  'idx_aum_rows_match_status_account',
  'idx_broker_accounts_contact_status',
  'idx_aum_snapshots_contact_date',
  'idx_daily_metrics_user_date'
)
ORDER BY idx_scan DESC;

-- ==========================================================
-- 3. EXPLAIN ANALYZE para queries críticas
-- ==========================================================
\echo ''
\echo '📊 Query 1: GET /contacts (listado principal)'
\echo 'Índice esperado: idx_contacts_advisor_deleted_updated'
\echo ''

-- Obtener un user_id de ejemplo
DO $$
DECLARE
  sample_user_id uuid;
BEGIN
  SELECT assigned_advisor_id INTO sample_user_id
  FROM contacts
  WHERE assigned_advisor_id IS NOT NULL
  LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM contacts
      WHERE assigned_advisor_id = %L
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 50
    ', sample_user_id);
  ELSE
    RAISE NOTICE 'No hay usuarios de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '📊 Query 2: GET /tasks (tareas abiertas por usuario)'
\echo 'Índice esperado: idx_tasks_open_by_user'
\echo ''

DO $$
DECLARE
  sample_user_id uuid;
BEGIN
  SELECT assigned_to_user_id INTO sample_user_id
  FROM tasks
  WHERE assigned_to_user_id IS NOT NULL
  LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM tasks
      WHERE assigned_to_user_id = %L
        AND status IN (''open'', ''in_progress'')
        AND deleted_at IS NULL
      ORDER BY due_date
      LIMIT 50
    ', sample_user_id);
  ELSE
    RAISE NOTICE 'No hay tareas de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '📊 Query 3: GET /contacts/:id/detail (timeline de notas)'
\echo 'Índice esperado: idx_notes_contact_created_desc'
\echo ''

DO $$
DECLARE
  sample_contact_id uuid;
BEGIN
  SELECT id INTO sample_contact_id
  FROM contacts
  LIMIT 1;
  
  IF sample_contact_id IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM notes
      WHERE contact_id = %L
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    ', sample_contact_id);
  ELSE
    RAISE NOTICE 'No hay contactos de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '📊 Query 4: AUM Matching (por status y account)'
\echo 'Índice esperado: idx_aum_rows_match_status_account'
\echo ''

DO $$
DECLARE
  sample_account text;
BEGIN
  SELECT account_number INTO sample_account
  FROM aum_import_rows
  WHERE account_number IS NOT NULL
  LIMIT 1;
  
  IF sample_account IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM aum_import_rows
      WHERE match_status = ''unmatched''
        AND account_number = %L
        AND is_preferred = true
      LIMIT 100
    ', sample_account);
  ELSE
    RAISE NOTICE 'No hay filas AUM de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '📊 Query 5: Broker Accounts por Contacto'
\echo 'Índice esperado: idx_broker_accounts_contact_status'
\echo ''

DO $$
DECLARE
  sample_contact_id uuid;
BEGIN
  SELECT contact_id INTO sample_contact_id
  FROM broker_accounts
  LIMIT 1;
  
  IF sample_contact_id IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM broker_accounts
      WHERE contact_id = %L
        AND status = ''active''
        AND deleted_at IS NULL
    ', sample_contact_id);
  ELSE
    RAISE NOTICE 'No hay broker accounts de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '📊 Query 6: AUM Snapshots por Contacto'
\echo 'Índice esperado: idx_aum_snapshots_contact_date'
\echo ''

DO $$
DECLARE
  sample_contact_id uuid;
BEGIN
  SELECT contact_id INTO sample_contact_id
  FROM aum_snapshots
  LIMIT 1;
  
  IF sample_contact_id IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM aum_snapshots
      WHERE contact_id = %L
      ORDER BY date DESC
      LIMIT 30
    ', sample_contact_id);
  ELSE
    RAISE NOTICE 'No hay snapshots AUM de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '📊 Query 7: Daily Metrics por Usuario'
\echo 'Índice esperado: idx_daily_metrics_user_date'
\echo ''

DO $$
DECLARE
  sample_user_id uuid;
BEGIN
  SELECT user_id INTO sample_user_id
  FROM daily_metrics_user
  LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    EXECUTE format('
      EXPLAIN ANALYZE
      SELECT *
      FROM daily_metrics_user
      WHERE user_id = %L
      ORDER BY date DESC
      LIMIT 30
    ', sample_user_id);
  ELSE
    RAISE NOTICE 'No hay métricas diarias de ejemplo para probar';
  END IF;
END $$;

\echo ''
\echo '✅ Verificación completada'

