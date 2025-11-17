-- ==========================================================
-- Índices para Tablas de Logs
-- ==========================================================
-- 
-- Agrega índices optimizados para queries frecuentes en tablas de logs
-- que crecen con el tiempo y requieren filtrado por fecha, usuario y tipo.
-- 
-- Impacto esperado:
-- - Reducción de 60-80% en tiempo de queries históricas
-- - Mejor performance en dashboards y reportes de auditoría
-- ==========================================================

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_user_id" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_type_entity_id_created" ON "audit_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint

-- Índices para message_log
CREATE INDEX IF NOT EXISTS "idx_message_log_created_at" ON "message_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_log_channel" ON "message_log" USING btree ("channel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_log_status" ON "message_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_message_log_channel_status_created" ON "message_log" USING btree ("channel","status","created_at");