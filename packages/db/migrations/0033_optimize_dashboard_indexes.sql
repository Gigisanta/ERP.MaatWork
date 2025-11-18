-- ==========================================================
-- Optimización de Índices para Dashboard y Queries Frecuentes
-- ==========================================================
-- 
-- Esta migración agrega índices compuestos optimizados para queries
-- frecuentes de dashboard y métricas que mejoran significativamente
-- el rendimiento de agregaciones y filtros.
-- 
-- Beneficio esperado: 30-50% mejora adicional en queries de dashboard
-- ==========================================================

-- ==========================================================
-- Índices para Dashboard KPIs
-- ==========================================================

-- Índice compuesto para conteos de contactos por advisor y fecha de creación
-- Optimiza queries de dashboard que filtran por advisor y agrupan por fecha
-- Ejemplo: "SELECT COUNT(*) FROM contacts WHERE assigned_advisor_id = ? AND created_at >= ?"
CREATE INDEX IF NOT EXISTS idx_contacts_advisor_deleted_created 
ON contacts (assigned_advisor_id, deleted_at, created_at)
WHERE deleted_at IS NULL;

-- Índice compuesto para métricas de tareas por usuario, estado y fecha
-- Optimiza queries de dashboard que agrupan tareas por fecha de creación
-- Ejemplo: "SELECT COUNT(*) FROM tasks WHERE assigned_to_user_id = ? AND status = ? AND created_at >= ?"
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status_created 
ON tasks (assigned_to_user_id, status, created_at)
WHERE deleted_at IS NULL;

-- Índice compuesto para conteos de portfolios activos por contacto
-- Optimiza queries de dashboard que filtran portfolios activos por contacto
-- Ejemplo: "SELECT COUNT(*) FROM client_portfolio_assignments WHERE contact_id = ? AND status = 'active'"
CREATE INDEX IF NOT EXISTS idx_client_portfolio_assignments_contact_status 
ON client_portfolio_assignments (contact_id, status);

-- Índice compuesto para queries de AUM por contacto y fecha
-- Optimiza joins entre contacts y aum_snapshots en dashboard
-- Ejemplo: "SELECT SUM(aum_total) FROM aum_snapshots JOIN contacts ON ... WHERE contacts.assigned_advisor_id = ? AND aum_snapshots.date = ?"
CREATE INDEX IF NOT EXISTS idx_aum_snapshots_contact_date 
ON aum_snapshots (contact_id, date);

-- Índice para queries de portfolio monitoring por contacto y fecha
-- Optimiza queries de dashboard que filtran por contacto y fecha
-- Ejemplo: "SELECT COUNT(*) FROM portfolio_monitoring_snapshot WHERE contact_id IN (...) AND as_of_date = ?"
CREATE INDEX IF NOT EXISTS idx_portfolio_monitoring_contact_date 
ON portfolio_monitoring_snapshot (contact_id, as_of_date);

-- ==========================================================
-- Índices para Pipeline Metrics
-- ==========================================================

-- Índice compuesto para queries de pipeline stage history por stage y fecha
-- Optimiza queries de métricas que agrupan por to_stage y filtran por fecha
-- Ejemplo: "SELECT to_stage, COUNT(*) FROM pipeline_stage_history WHERE to_stage IN (...) AND changed_at >= ? GROUP BY to_stage"
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_to_stage_changed 
ON pipeline_stage_history (to_stage, changed_at);

-- Índice compuesto para queries de pipeline stage history por stage origen y fecha
-- Optimiza queries de métricas que agrupan por from_stage y filtran por fecha
-- Ejemplo: "SELECT from_stage, COUNT(*) FROM pipeline_stage_history WHERE from_stage IN (...) AND changed_at >= ? GROUP BY from_stage"
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_history_from_stage_changed 
ON pipeline_stage_history (from_stage, changed_at);

-- ==========================================================
-- Comentarios de Documentación
-- ==========================================================

COMMENT ON INDEX idx_contacts_advisor_deleted_created IS 
'Índice compuesto para optimizar conteos de contactos por advisor y fecha de creación en dashboard';

COMMENT ON INDEX idx_tasks_assigned_status_created IS 
'Índice compuesto para optimizar métricas de tareas por usuario, estado y fecha de creación en dashboard';

COMMENT ON INDEX idx_client_portfolio_assignments_contact_status IS 
'Índice compuesto para optimizar conteos de portfolios activos por contacto en dashboard';

COMMENT ON INDEX idx_aum_snapshots_contact_date IS 
'Índice compuesto para optimizar joins entre contacts y aum_snapshots en queries de dashboard';

COMMENT ON INDEX idx_portfolio_monitoring_contact_date IS 
'Índice compuesto para optimizar queries de portfolio monitoring por contacto y fecha en dashboard';

COMMENT ON INDEX idx_pipeline_stage_history_to_stage_changed IS 
'Índice compuesto para optimizar queries de pipeline metrics que agrupan por to_stage y filtran por fecha';

COMMENT ON INDEX idx_pipeline_stage_history_from_stage_changed IS 
'Índice compuesto para optimizar queries de pipeline metrics que agrupan por from_stage y filtran por fecha';




