-- Optimización de queries del CRM
-- Crear índices para mejorar el rendimiento de las consultas más frecuentes

-- Índices para la tabla contacts
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact_date ON contacts(last_contact_date);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);

-- Índices para la tabla notes
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_author_id ON notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_priority ON notes(priority);
CREATE INDEX IF NOT EXISTS idx_notes_is_private ON notes(is_private);

-- Índices para la tabla tasks
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Índices para la tabla notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Índices para la tabla contact_tags
CREATE INDEX IF NOT EXISTS idx_contact_tags_user_id ON contact_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_name ON contact_tags(name);
CREATE INDEX IF NOT EXISTS idx_contact_tags_created_at ON contact_tags(created_at);

-- Índices para métricas y reportes
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id_date ON user_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_metrics_team_id ON user_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_monthly_conversion_metrics_user_id_year_month ON monthly_conversion_metrics(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_conversion_metrics_year_month ON monthly_conversion_metrics(year, month);

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_contacts_status_assigned_to ON contacts(status, assigned_to);
CREATE INDEX IF NOT EXISTS idx_notes_contact_type_created ON notes(contact_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_team_status_due ON tasks(team_id, status, due_date);

-- Optimizar consultas con vistas materializadas para reportes frecuentes
CREATE MATERIALIZED VIEW IF NOT EXISTS contact_summary_by_assigned AS
SELECT 
    assigned_to,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN status = 'Cliente' THEN 1 END) as clients,
    COUNT(CASE WHEN status = 'Prospecto' THEN 1 END) as prospects,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_contacts_30d,
    AVG(value) as avg_contact_value,
    SUM(value) as total_value
FROM contacts
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;

-- Crear índice en la vista materializada
CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_summary_assigned_to ON contact_summary_by_assigned(assigned_to);

-- Vista para métricas de actividad por usuario
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    um.user_id,
    um.team_id,
    DATE_TRUNC('month', um.date) as month,
    SUM(um.contacts_created) as total_contacts_created,
    SUM(um.contacts_converted) as total_contacts_converted,
    SUM(um.calls_made) as total_calls_made,
    SUM(um.emails_sent) as total_emails_sent,
    SUM(um.revenue_generated) as total_revenue,
    AVG(um.pipeline_value) as avg_pipeline_value
FROM user_metrics um
GROUP BY um.user_id, um.team_id, DATE_TRUNC('month', um.date);

-- Índice para la vista de actividad
CREATE INDEX IF NOT EXISTS idx_user_activity_summary_user_month ON user_activity_summary(user_id, month);

-- Función para refrescar las vistas materializadas
CREATE OR REPLACE FUNCTION refresh_crm_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY contact_summary_by_assigned;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentar las optimizaciones
COMMENT ON INDEX idx_contacts_assigned_to IS 'Optimiza consultas de contactos por usuario asignado';
COMMENT ON INDEX idx_contacts_status IS 'Optimiza filtros por estado de contacto';
COMMENT ON INDEX idx_notes_contact_id IS 'Optimiza consultas de notas por contacto';
COMMENT ON MATERIALIZED VIEW contact_summary_by_assigned IS 'Vista materializada para métricas rápidas de contactos por usuario asignado';
COMMENT ON MATERIALIZED VIEW user_activity_summary IS 'Vista materializada para resumen de actividad mensual por usuario';