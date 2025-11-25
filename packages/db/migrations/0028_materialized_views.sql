-- ==========================================================
-- Materialized Views para Optimización de Queries
-- ==========================================================
-- 
-- Estas materialized views pre-calculan agregaciones frecuentes
-- para mejorar significativamente el rendimiento de queries.
-- 
-- Refresh Strategy:
-- - mv_team_metrics_daily: Refresh diario automático (vía job)
-- - mv_contact_aum_summary: Refresh incremental después de imports AUM
-- - mv_portfolio_deviation_summary: Refresh diario automático (vía job)
-- ==========================================================

-- ==========================================================
-- Materialized View: Métricas Diarias de Equipos
-- ==========================================================
-- Pre-calculates daily team metrics (memberCount, clientCount, portfolioCount)
-- Reduces query time from ~300-400ms to ~5-10ms
-- ==========================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_team_metrics_daily AS
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  t.manager_user_id,
  COUNT(DISTINCT tm.user_id) AS member_count,
  COUNT(DISTINCT CASE WHEN c.deleted_at IS NULL THEN c.id END) AS client_count,
  COUNT(DISTINCT CASE WHEN cpa.status = 'active' THEN cpa.id END) AS portfolio_count,
  CURRENT_DATE AS metric_date,
  NOW() AS last_refreshed_at
FROM teams t
LEFT JOIN team_membership tm ON t.id = tm.team_id
LEFT JOIN users u ON tm.user_id = u.id
LEFT JOIN contacts c ON c.assigned_advisor_id = u.id AND c.deleted_at IS NULL
LEFT JOIN client_portfolio_assignments cpa ON cpa.contact_id = c.id AND cpa.status = 'active'
GROUP BY t.id, t.name, t.manager_user_id;

-- Índice único para búsqueda rápida por team_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_team_metrics_team_id 
ON mv_team_metrics_daily (team_id);

-- Índice para búsqueda por fecha (útil para historial)
CREATE INDEX IF NOT EXISTS idx_mv_team_metrics_date 
ON mv_team_metrics_daily (metric_date);

-- ==========================================================
-- Materialized View: Resumen de AUM por Contacto
-- ==========================================================
-- Pre-calculates latest AUM total per contact
-- Reduces query time from ~100-200ms to ~5-10ms
-- ==========================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_contact_aum_summary AS
SELECT DISTINCT ON (c.id)
  c.id AS contact_id,
  c.first_name,
  c.last_name,
  c.full_name,
  c.assigned_advisor_id,
  aum.aum_total,
  aum.date AS last_aum_date,
  NOW() AS last_refreshed_at
FROM contacts c
LEFT JOIN LATERAL (
  SELECT 
    aum_snapshots.aum_total,
    aum_snapshots.date
  FROM aum_snapshots
  WHERE aum_snapshots.contact_id = c.id
  ORDER BY aum_snapshots.date DESC
  LIMIT 1
) aum ON true
WHERE c.deleted_at IS NULL;

-- Índice único para búsqueda rápida por contact_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_contact_aum_contact_id 
ON mv_contact_aum_summary (contact_id);

-- Índice para búsqueda por advisor (útil para dashboards)
CREATE INDEX IF NOT EXISTS idx_mv_contact_aum_advisor 
ON mv_contact_aum_summary (assigned_advisor_id);

-- ==========================================================
-- Materialized View: Resumen de Desviación de Portfolio
-- ==========================================================
-- Pre-calculates latest portfolio deviation per contact
-- Reduces query time from ~150-250ms to ~5-10ms
-- ==========================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_portfolio_deviation_summary AS
SELECT DISTINCT ON (c.id)
  c.id AS contact_id,
  c.first_name,
  c.last_name,
  c.full_name,
  c.assigned_advisor_id,
  pms.total_deviation_pct,
  pms.as_of_date,
  CASE 
    WHEN pms.total_deviation_pct > 10 THEN 'alert'
    WHEN pms.total_deviation_pct > 5 THEN 'warning'
    ELSE 'ok'
  END AS alert_status,
  NOW() AS last_refreshed_at
FROM contacts c
LEFT JOIN LATERAL (
  SELECT 
    portfolio_monitoring_snapshot.total_deviation_pct,
    portfolio_monitoring_snapshot.as_of_date
  FROM portfolio_monitoring_snapshot
  WHERE portfolio_monitoring_snapshot.contact_id = c.id
  ORDER BY portfolio_monitoring_snapshot.as_of_date DESC
  LIMIT 1
) pms ON true
WHERE c.deleted_at IS NULL;

-- Índice único para búsqueda rápida por contact_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_portfolio_deviation_contact_id 
ON mv_portfolio_deviation_summary (contact_id);

-- Índice para búsqueda por advisor (útil para dashboards)
CREATE INDEX IF NOT EXISTS idx_mv_portfolio_deviation_advisor 
ON mv_portfolio_deviation_summary (assigned_advisor_id);

-- Índice para búsqueda por alert_status (útil para alertas)
CREATE INDEX IF NOT EXISTS idx_mv_portfolio_deviation_alert_status 
ON mv_portfolio_deviation_summary (alert_status);

-- ==========================================================
-- Funciones Helper para Refresh
-- ==========================================================

-- Función para refresh de mv_team_metrics_daily
CREATE OR REPLACE FUNCTION refresh_mv_team_metrics_daily()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_metrics_daily;
END;
$$ LANGUAGE plpgsql;

-- Función para refresh de mv_contact_aum_summary
CREATE OR REPLACE FUNCTION refresh_mv_contact_aum_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contact_aum_summary;
END;
$$ LANGUAGE plpgsql;

-- Función para refresh de mv_portfolio_deviation_summary
CREATE OR REPLACE FUNCTION refresh_mv_portfolio_deviation_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_deviation_summary;
END;
$$ LANGUAGE plpgsql;

-- Función para refresh de todas las materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_team_metrics_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_contact_aum_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_portfolio_deviation_summary;
END;
$$ LANGUAGE plpgsql;

