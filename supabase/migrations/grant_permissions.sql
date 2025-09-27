-- Otorgar permisos a los roles anon y authenticated para las nuevas tablas

-- Permisos para la tabla contacts
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO authenticated;

-- Permisos para la tabla contact_status_history
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_status_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON contact_status_history TO authenticated;

-- Permisos para la tabla monthly_conversion_metrics
GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_conversion_metrics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON monthly_conversion_metrics TO authenticated;

-- Permisos para la tabla historical_metrics
GRANT SELECT, INSERT, UPDATE, DELETE ON historical_metrics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON historical_metrics TO authenticated;

-- Otorgar permisos para usar secuencias (necesario para UUIDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;