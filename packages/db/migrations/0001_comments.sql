-- PostgreSQL 17
-- Comentarios de tablas y columnas para documentación del esquema

-- ==========================
-- Lookups
-- ==========================
COMMENT ON TABLE lookup_asset_class IS 'Catálogo de clases de activo. Evita enums rígidos y permite i18n.';
COMMENT ON COLUMN lookup_asset_class.id IS 'Identificador estable (p.ej. equity, bond).';
COMMENT ON COLUMN lookup_asset_class.label IS 'Descripción legible de la clase de activo.';

COMMENT ON TABLE lookup_task_status IS 'Catálogo de estados de tarea.';
COMMENT ON COLUMN lookup_task_status.id IS 'Identificador del estado (open, in_progress, done, cancelled).';
COMMENT ON COLUMN lookup_task_status.label IS 'Descripción legible del estado de tarea.';

COMMENT ON TABLE lookup_priority IS 'Catálogo de prioridades de tareas.';
COMMENT ON COLUMN lookup_priority.id IS 'Identificador de prioridad (low, normal, high, urgent).';
COMMENT ON COLUMN lookup_priority.label IS 'Descripción legible de la prioridad.';

COMMENT ON TABLE lookup_meeting_source IS 'Catálogo de orígenes de reunión (zoom, meet, teams, etc.).';
COMMENT ON COLUMN lookup_meeting_source.id IS 'Identificador del origen.';
COMMENT ON COLUMN lookup_meeting_source.label IS 'Descripción legible del origen de la reunión.';

COMMENT ON TABLE lookup_notification_type IS 'Catálogo de tipos de notificación.';
COMMENT ON COLUMN lookup_notification_type.id IS 'Identificador del tipo (saldo_liquido, cliente_inactivo, etc.).';
COMMENT ON COLUMN lookup_notification_type.label IS 'Descripción legible del tipo.';

-- ==========================
-- Identidad y equipos
-- ==========================
COMMENT ON TABLE teams IS 'Equipos de trabajo dentro del CRM. Un manager puede liderar el equipo.';
COMMENT ON COLUMN teams.id IS 'UUID primario del equipo.';
COMMENT ON COLUMN teams.name IS 'Nombre del equipo.';
COMMENT ON COLUMN teams.manager_user_id IS 'Usuario manager responsable del equipo (opcional).';
COMMENT ON COLUMN teams.created_at IS 'Fecha de creación del equipo.';

COMMENT ON TABLE users IS 'Usuarios del sistema: asesores, managers y administradores.';
COMMENT ON COLUMN users.id IS 'UUID primario del usuario.';
COMMENT ON COLUMN users.email IS 'Email único del usuario (login y contacto).';
COMMENT ON COLUMN users.full_name IS 'Nombre completo del usuario.';
COMMENT ON COLUMN users.role IS 'Rol del usuario: advisor, manager o admin.';
COMMENT ON COLUMN users.is_active IS 'Indica si el usuario está activo.';
COMMENT ON COLUMN users.team_id IS 'Equipo al que pertenece el usuario (opcional).';
COMMENT ON COLUMN users.manager_id IS 'Manager directo del usuario (FK self) (opcional).';
COMMENT ON COLUMN users.created_at IS 'Fecha de creación del usuario.';
COMMENT ON COLUMN users.updated_at IS 'Fecha de última actualización del usuario.';

COMMENT ON TABLE team_membership IS 'Membresías de usuarios en equipos, incluyendo rol en el equipo.';
COMMENT ON COLUMN team_membership.id IS 'UUID primario de la membresía.';
COMMENT ON COLUMN team_membership.team_id IS 'Equipo asociado.';
COMMENT ON COLUMN team_membership.user_id IS 'Usuario asociado.';
COMMENT ON COLUMN team_membership.role IS 'Rol dentro del equipo: member o lead.';
COMMENT ON COLUMN team_membership.created_at IS 'Fecha de creación de la membresía.';

-- ==========================
-- Contactos y pipeline
-- ==========================
COMMENT ON TABLE contacts IS 'Contactos/Clientes del CRM, con asignación a asesor/equipo.';
COMMENT ON COLUMN contacts.id IS 'UUID primario del contacto.';
COMMENT ON COLUMN contacts.first_name IS 'Nombre del contacto.';
COMMENT ON COLUMN contacts.last_name IS 'Apellido del contacto.';
COMMENT ON COLUMN contacts.full_name IS 'Nombre completo (puede materializarse vía trigger).';
COMMENT ON COLUMN contacts.email IS 'Email del contacto (único cuando existe).';
COMMENT ON COLUMN contacts.phone IS 'Teléfono del contacto.';
COMMENT ON COLUMN contacts.lifecycle_stage IS 'Etapa del ciclo: lead, prospect, client, inactive.';
COMMENT ON COLUMN contacts.source IS 'Origen del contacto (campaña, referral, etc.).';
COMMENT ON COLUMN contacts.risk_profile IS 'Perfil de riesgo: low, mid, high.';
COMMENT ON COLUMN contacts.assigned_advisor_id IS 'Asesor asignado al contacto (FK users).';
COMMENT ON COLUMN contacts.assigned_team_id IS 'Equipo asignado (FK teams).';
COMMENT ON COLUMN contacts.notes IS 'Notas internas libres.';
COMMENT ON COLUMN contacts.contact_last_touch_at IS 'Último contacto/actividad registrada (para inactividad).';
COMMENT ON COLUMN contacts.pipeline_stage_updated_at IS 'Último cambio de etapa de pipeline.';
COMMENT ON COLUMN contacts.deleted_at IS 'Soft delete: fecha de borrado lógico.';
COMMENT ON COLUMN contacts.created_at IS 'Fecha de creación del contacto.';
COMMENT ON COLUMN contacts.updated_at IS 'Fecha de última actualización del contacto.';

COMMENT ON TABLE pipeline_stage_history IS 'Historial de cambios de etapa por contacto.';
COMMENT ON COLUMN pipeline_stage_history.id IS 'UUID primario del evento.';
COMMENT ON COLUMN pipeline_stage_history.contact_id IS 'Contacto afectado.';
COMMENT ON COLUMN pipeline_stage_history.from_stage IS 'Etapa previa (puede ser NULL en creación).';
COMMENT ON COLUMN pipeline_stage_history.to_stage IS 'Nueva etapa asignada.';
COMMENT ON COLUMN pipeline_stage_history.reason IS 'Motivo o contexto del cambio.';
COMMENT ON COLUMN pipeline_stage_history.changed_by_user_id IS 'Usuario que realizó el cambio.';
COMMENT ON COLUMN pipeline_stage_history.changed_at IS 'Fecha/hora del cambio.';

-- ==========================
-- Etiquetas
-- ==========================
COMMENT ON TABLE tags IS 'Etiquetas reutilizables por alcance: contact, meeting, note.';
COMMENT ON COLUMN tags.id IS 'UUID primario de la etiqueta.';
COMMENT ON COLUMN tags.scope IS 'Ámbito de aplicación: contact, meeting, note.';
COMMENT ON COLUMN tags.name IS 'Nombre de la etiqueta.';
COMMENT ON COLUMN tags.is_system IS 'Indica si la etiqueta es del sistema (no editable).';
COMMENT ON COLUMN tags.created_by_user_id IS 'Usuario creador de la etiqueta.';
COMMENT ON COLUMN tags.created_at IS 'Fecha de creación de la etiqueta.';

COMMENT ON TABLE contact_tags IS 'Relación N:M entre contactos y etiquetas.';
COMMENT ON COLUMN contact_tags.id IS 'UUID primario.';
COMMENT ON COLUMN contact_tags.contact_id IS 'Contacto etiquetado.';
COMMENT ON COLUMN contact_tags.tag_id IS 'Etiqueta aplicada.';
COMMENT ON COLUMN contact_tags.created_at IS 'Fecha de asociación de etiqueta.';

-- ==========================
-- Reuniones y Notas con IA
-- ==========================
COMMENT ON TABLE meetings IS 'Reuniones de clientes (Zoom/Meet/etc.) asociadas a contactos.';
COMMENT ON COLUMN meetings.id IS 'UUID primario de la reunión.';
COMMENT ON COLUMN meetings.contact_id IS 'Contacto al que pertenece la reunión.';
COMMENT ON COLUMN meetings.organizer_user_id IS 'Usuario organizador de la reunión.';
COMMENT ON COLUMN meetings.started_at IS 'Inicio de la reunión.';
COMMENT ON COLUMN meetings.ended_at IS 'Fin de la reunión (opcional).';
COMMENT ON COLUMN meetings.source IS 'Origen de la reunión (lookup_meeting_source).';
COMMENT ON COLUMN meetings.external_meeting_id IS 'ID externo de la reunión (plataforma).';
COMMENT ON COLUMN meetings.recording_url IS 'URL de grabación (si existe).';
COMMENT ON COLUMN meetings.status IS 'Estado: scheduled, completed, cancelled.';
COMMENT ON COLUMN meetings.deleted_at IS 'Soft delete de la reunión.';
COMMENT ON COLUMN meetings.created_at IS 'Fecha de creación del registro.';

COMMENT ON TABLE meeting_participants IS 'Participantes de la reunión (usuario, contacto o externo).';
COMMENT ON COLUMN meeting_participants.id IS 'UUID primario.';
COMMENT ON COLUMN meeting_participants.meeting_id IS 'Reunión relacionada.';
COMMENT ON COLUMN meeting_participants.participant_type IS 'Tipo de participante: user/contact/external.';
COMMENT ON COLUMN meeting_participants.user_id IS 'Usuario participante (si aplica).';
COMMENT ON COLUMN meeting_participants.contact_id IS 'Contacto participante (si aplica).';
COMMENT ON COLUMN meeting_participants.email IS 'Email del participante externo (si aplica).';
COMMENT ON COLUMN meeting_participants.display_name IS 'Nombre mostrado del participante.';

COMMENT ON TABLE transcription_segments IS 'Segmentos de transcripción con timestamps y orador.';
COMMENT ON COLUMN transcription_segments.id IS 'UUID primario.';
COMMENT ON COLUMN transcription_segments.meeting_id IS 'Reunión a la que pertenece el segmento.';
COMMENT ON COLUMN transcription_segments.start_ms IS 'Tiempo de inicio (ms) del segmento.';
COMMENT ON COLUMN transcription_segments.end_ms IS 'Tiempo de fin (ms) del segmento.';
COMMENT ON COLUMN transcription_segments.speaker_label IS 'Etiqueta del orador (si existe).';
COMMENT ON COLUMN transcription_segments.text IS 'Texto transcrito del segmento.';

COMMENT ON TABLE meeting_ai IS 'Salida de IA por reunión: resumen, tareas, keywords y sentimiento.';
COMMENT ON COLUMN meeting_ai.id IS 'UUID primario.';
COMMENT ON COLUMN meeting_ai.meeting_id IS 'Reunión a la que aplica la salida de IA (único).';
COMMENT ON COLUMN meeting_ai.model IS 'Modelo utilizado para la inferencia.';
COMMENT ON COLUMN meeting_ai.prompt_version IS 'Versión del prompt/plantilla usada.';
COMMENT ON COLUMN meeting_ai.summary IS 'Resumen de la reunión.';
COMMENT ON COLUMN meeting_ai.action_items IS 'Acciones detectadas por IA (jsonb).';
COMMENT ON COLUMN meeting_ai.commitments IS 'Compromisos detectados por IA (jsonb).';
COMMENT ON COLUMN meeting_ai.keywords IS 'Palabras clave extraídas.';
COMMENT ON COLUMN meeting_ai.sentiment IS 'Puntaje de sentimiento (-1..1).';
COMMENT ON COLUMN meeting_ai.language IS 'Idioma detectado.';
COMMENT ON COLUMN meeting_ai.duration_ms IS 'Duración total (ms) de la reunión.';
COMMENT ON COLUMN meeting_ai.created_at IS 'Fecha de creación del registro de IA.';

COMMENT ON TABLE notes IS 'Notas unificadas (IA/manual/import) asociadas a un contacto y opcionalmente a una reunión.';
COMMENT ON COLUMN notes.id IS 'UUID primario.';
COMMENT ON COLUMN notes.contact_id IS 'Contacto al que pertenece la nota.';
COMMENT ON COLUMN notes.meeting_id IS 'Reunión de origen (si aplica).';
COMMENT ON COLUMN notes.author_user_id IS 'Autor de la nota (si existe).';
COMMENT ON COLUMN notes.source IS 'Fuente: ai, manual, import.';
COMMENT ON COLUMN notes.note_type IS 'Tipo: summary, action_items, transcription, general.';
COMMENT ON COLUMN notes.content IS 'Contenido textual de la nota.';
COMMENT ON COLUMN notes.keywords IS 'Palabras clave asociadas.';
COMMENT ON COLUMN notes.sentiment IS 'Puntaje de sentimiento (-1..1).';
COMMENT ON COLUMN notes.language IS 'Idioma del contenido.';
COMMENT ON COLUMN notes.deleted_at IS 'Soft delete de la nota.';
COMMENT ON COLUMN notes.created_at IS 'Fecha de creación de la nota.';

COMMENT ON TABLE note_tags IS 'Relación N:M entre notas y etiquetas.';
COMMENT ON COLUMN note_tags.id IS 'UUID primario.';
COMMENT ON COLUMN note_tags.note_id IS 'Nota etiquetada.';
COMMENT ON COLUMN note_tags.tag_id IS 'Etiqueta aplicada.';
COMMENT ON COLUMN note_tags.created_at IS 'Fecha de asociación de etiqueta.';

COMMENT ON TABLE meeting_tags IS 'Relación N:M entre reuniones y etiquetas.';
COMMENT ON COLUMN meeting_tags.id IS 'UUID primario.';
COMMENT ON COLUMN meeting_tags.meeting_id IS 'Reunión etiquetada.';
COMMENT ON COLUMN meeting_tags.tag_id IS 'Etiqueta aplicada.';
COMMENT ON COLUMN meeting_tags.created_at IS 'Fecha de asociación de etiqueta.';

-- ==========================
-- Tareas y notificaciones
-- ==========================
COMMENT ON TABLE tasks IS 'Tareas y seguimiento para contactos; origen IA/manual/automatización.';
COMMENT ON COLUMN tasks.id IS 'UUID primario de la tarea.';
COMMENT ON COLUMN tasks.contact_id IS 'Contacto asociado a la tarea.';
COMMENT ON COLUMN tasks.meeting_id IS 'Reunión asociada (si aplica).';
COMMENT ON COLUMN tasks.title IS 'Título breve de la tarea.';
COMMENT ON COLUMN tasks.description IS 'Descripción detallada.';
COMMENT ON COLUMN tasks.status IS 'Estado (lookup_task_status).';
COMMENT ON COLUMN tasks.due_date IS 'Fecha de vencimiento.';
COMMENT ON COLUMN tasks.priority IS 'Prioridad (lookup_priority).';
COMMENT ON COLUMN tasks.assigned_to_user_id IS 'Usuario asignado.';
COMMENT ON COLUMN tasks.created_by_user_id IS 'Usuario creador.';
COMMENT ON COLUMN tasks.created_from IS 'Origen de creación: ai, manual o automation.';
COMMENT ON COLUMN tasks.origin_ref IS 'Referencia de origen (jsonb), p.ej. segmento de transcripción.';
COMMENT ON COLUMN tasks.completed_at IS 'Fecha de finalización.';
COMMENT ON COLUMN tasks.deleted_at IS 'Soft delete.';
COMMENT ON COLUMN tasks.version IS 'Versión para optimistic locking.';
COMMENT ON COLUMN tasks.created_at IS 'Fecha de creación de la tarea.';
COMMENT ON COLUMN tasks.updated_at IS 'Fecha de última actualización de la tarea.';

COMMENT ON TABLE notifications IS 'Notificaciones a usuarios con payload contextual y canales entregados.';
COMMENT ON COLUMN notifications.id IS 'UUID primario.';
COMMENT ON COLUMN notifications.user_id IS 'Usuario destinatario.';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación (lookup_notification_type).';
COMMENT ON COLUMN notifications.severity IS 'Severidad: info, warning, critical.';
COMMENT ON COLUMN notifications.contact_id IS 'Contacto relacionado (si aplica).';
COMMENT ON COLUMN notifications.payload IS 'Payload contextual (jsonb).';
COMMENT ON COLUMN notifications.delivered_channels IS 'Canales por los que se entregó (email/whatsapp/push).';
COMMENT ON COLUMN notifications.read_at IS 'Fecha de lectura.';
COMMENT ON COLUMN notifications.processed IS 'Marcador para colas/worker (pendiente/procesado).';
COMMENT ON COLUMN notifications.created_at IS 'Fecha de creación.';

COMMENT ON TABLE user_channel_preferences IS 'Preferencias de canales por usuario para notificaciones.';
COMMENT ON COLUMN user_channel_preferences.id IS 'UUID primario.';
COMMENT ON COLUMN user_channel_preferences.user_id IS 'Usuario propietario de las preferencias.';
COMMENT ON COLUMN user_channel_preferences.channel IS 'Canal: email, whatsapp, push.';
COMMENT ON COLUMN user_channel_preferences.enabled IS 'Si el canal está habilitado.';
COMMENT ON COLUMN user_channel_preferences.address IS 'Configuración/destino del canal (jsonb).';
COMMENT ON COLUMN user_channel_preferences.created_at IS 'Fecha de creación.';

COMMENT ON TABLE message_log IS 'Bitácora de mensajes enviados (email/whatsapp/push) y su estado.';
COMMENT ON COLUMN message_log.id IS 'UUID primario.';
COMMENT ON COLUMN message_log.channel IS 'Canal de envío.';
COMMENT ON COLUMN message_log.to_ref IS 'Destino del mensaje (jsonb).';
COMMENT ON COLUMN message_log.subject IS 'Asunto (si aplica).';
COMMENT ON COLUMN message_log.body IS 'Cuerpo del mensaje.';
COMMENT ON COLUMN message_log.status IS 'Estado de envío: queued, sent, failed.';
COMMENT ON COLUMN message_log.provider_message_id IS 'ID del proveedor externo (si existe).';
COMMENT ON COLUMN message_log.error IS 'Error de envío (si hubo).';
COMMENT ON COLUMN message_log.related_notification_id IS 'Notificación relacionada (si aplica).';
COMMENT ON COLUMN message_log.created_at IS 'Fecha de registro del envío.';

-- ==========================
-- Instrumentos
-- ==========================
COMMENT ON TABLE instruments IS 'Instrumentos financieros disponibles con metadatos.';
COMMENT ON COLUMN instruments.id IS 'UUID primario.';
COMMENT ON COLUMN instruments.symbol IS 'Símbolo del instrumento.';
COMMENT ON COLUMN instruments.name IS 'Nombre del instrumento.';
COMMENT ON COLUMN instruments.asset_class IS 'Clase de activo (lookup_asset_class).';
COMMENT ON COLUMN instruments.currency IS 'Moneda del instrumento.';
COMMENT ON COLUMN instruments.isin IS 'Código ISIN (si existe).';
COMMENT ON COLUMN instruments.external_codes IS 'Códigos externos por sistema/broker (jsonb).';
COMMENT ON COLUMN instruments.maturity_date IS 'Fecha de vencimiento (bonos).';
COMMENT ON COLUMN instruments.coupon_rate IS 'Cupón (si aplica).';
COMMENT ON COLUMN instruments.risk_rating IS 'Rating de riesgo (si aplica).';
COMMENT ON COLUMN instruments.active IS 'Si el instrumento está activo.';
COMMENT ON COLUMN instruments.created_at IS 'Fecha de alta.';

COMMENT ON TABLE instrument_aliases IS 'Alias/códigos alternativos por broker para conciliación.';
COMMENT ON COLUMN instrument_aliases.id IS 'UUID primario.';
COMMENT ON COLUMN instrument_aliases.instrument_id IS 'Instrumento asociado.';
COMMENT ON COLUMN instrument_aliases.broker IS 'Broker al que corresponde el alias.';
COMMENT ON COLUMN instrument_aliases.code IS 'Código/alias en el broker.';

-- ==========================
-- Integración Balanz
-- ==========================
COMMENT ON TABLE integration_accounts IS 'Cuentas/config de integración (p.ej., Balanz).';
COMMENT ON COLUMN integration_accounts.id IS 'UUID primario.';
COMMENT ON COLUMN integration_accounts.broker IS 'Broker de la integración.';
COMMENT ON COLUMN integration_accounts.masked_username IS 'Usuario enmascarado para logs/identificación.';
COMMENT ON COLUMN integration_accounts.auth_type IS 'Tipo de autenticación: password/otp/token/cookies.';
COMMENT ON COLUMN integration_accounts.config IS 'Configuración específica (jsonb).';
COMMENT ON COLUMN integration_accounts.status IS 'Estado de la integración: active/disabled.';
COMMENT ON COLUMN integration_accounts.created_at IS 'Fecha de creación.';
COMMENT ON COLUMN integration_accounts.updated_at IS 'Fecha de última actualización.';

COMMENT ON TABLE integration_jobs IS 'Jobs programados para descargas/procesos de integración.';
COMMENT ON COLUMN integration_jobs.id IS 'UUID primario.';
COMMENT ON COLUMN integration_jobs.type IS 'Tipo de job (download_reports, movimientos, etc.).';
COMMENT ON COLUMN integration_jobs.schedule_cron IS 'Expresión cron del job.';
COMMENT ON COLUMN integration_jobs.enabled IS 'Si el job está habilitado.';
COMMENT ON COLUMN integration_jobs.last_run_at IS 'Última ejecución del job.';
COMMENT ON COLUMN integration_jobs.created_by_user_id IS 'Usuario creador del job.';

COMMENT ON TABLE integration_runs IS 'Ejecuciones de jobs de integración con estado y tiempos.';
COMMENT ON COLUMN integration_runs.id IS 'UUID primario.';
COMMENT ON COLUMN integration_runs.job_id IS 'Job asociado.';
COMMENT ON COLUMN integration_runs.started_at IS 'Inicio de la ejecución.';
COMMENT ON COLUMN integration_runs.finished_at IS 'Fin de la ejecución.';
COMMENT ON COLUMN integration_runs.status IS 'Estado: success, warning, failed.';
COMMENT ON COLUMN integration_runs.error IS 'Mensaje de error (si aplica).';
COMMENT ON COLUMN integration_runs.stats IS 'Estadísticas de la ejecución (jsonb).';

COMMENT ON TABLE integration_files IS 'Archivos descargados por una ejecución.';
COMMENT ON COLUMN integration_files.id IS 'UUID primario.';
COMMENT ON COLUMN integration_files.run_id IS 'Ejecución asociada.';
COMMENT ON COLUMN integration_files.file_type IS 'Tipo de archivo.';
COMMENT ON COLUMN integration_files.path IS 'Ruta de archivo en el sistema.';
COMMENT ON COLUMN integration_files.size_bytes IS 'Tamaño del archivo en bytes.';
COMMENT ON COLUMN integration_files.checksum IS 'Checksum del archivo (si aplica).';
COMMENT ON COLUMN integration_files.created_at IS 'Fecha de registro.';

COMMENT ON TABLE staging_raw_records IS 'Registros crudos para parseo/ETL antes de normalizar.';
COMMENT ON COLUMN staging_raw_records.id IS 'UUID primario.';
COMMENT ON COLUMN staging_raw_records.run_id IS 'Ejecución origen.';
COMMENT ON COLUMN staging_raw_records.source IS 'Fuente dentro del broker (movimientos/saldos/posiciones/extractos).';
COMMENT ON COLUMN staging_raw_records.raw IS 'Contenido crudo (jsonb).';
COMMENT ON COLUMN staging_raw_records.processed IS 'Indicador de procesamiento.';
COMMENT ON COLUMN staging_raw_records.created_at IS 'Fecha de ingreso.';

COMMENT ON TABLE parse_errors IS 'Errores al parsear registros de staging por ejecución.';
COMMENT ON COLUMN parse_errors.id IS 'UUID primario.';
COMMENT ON COLUMN parse_errors.run_id IS 'Ejecución asociada.';
COMMENT ON COLUMN parse_errors.record_ref IS 'Referencia al registro problemático.';
COMMENT ON COLUMN parse_errors.error IS 'Mensaje de error.';
COMMENT ON COLUMN parse_errors.created_at IS 'Fecha de registro del error.';

-- ==========================
-- Cuentas/posiciones/transacciones
-- ==========================
COMMENT ON TABLE broker_accounts IS 'Cuentas en broker asociadas a contactos.';
COMMENT ON COLUMN broker_accounts.id IS 'UUID primario.';
COMMENT ON COLUMN broker_accounts.broker IS 'Broker de la cuenta.';
COMMENT ON COLUMN broker_accounts.account_number IS 'Número de cuenta en el broker.';
COMMENT ON COLUMN broker_accounts.holder_name IS 'Titular de la cuenta (si aplica).';
COMMENT ON COLUMN broker_accounts.contact_id IS 'Contacto dueño de la cuenta.';
COMMENT ON COLUMN broker_accounts.status IS 'Estado de la cuenta: active/closed.';
COMMENT ON COLUMN broker_accounts.last_synced_at IS 'Última sincronización con el broker.';

COMMENT ON TABLE broker_balances IS 'Saldos históricos por cuenta/moneda/fecha.';
COMMENT ON COLUMN broker_balances.id IS 'UUID primario.';
COMMENT ON COLUMN broker_balances.broker_account_id IS 'Cuenta asociada.';
COMMENT ON COLUMN broker_balances.as_of_date IS 'Fecha de referencia del saldo.';
COMMENT ON COLUMN broker_balances.currency IS 'Moneda del saldo.';
COMMENT ON COLUMN broker_balances.liquid_balance IS 'Saldo líquido disponible.';
COMMENT ON COLUMN broker_balances.total_balance IS 'Saldo total.';

COMMENT ON TABLE broker_transactions IS 'Transacciones históricas por cuenta (compras/ventas/movimientos).';
COMMENT ON COLUMN broker_transactions.id IS 'UUID primario.';
COMMENT ON COLUMN broker_transactions.broker_account_id IS 'Cuenta asociada.';
COMMENT ON COLUMN broker_transactions.trade_date IS 'Fecha de concertación.';
COMMENT ON COLUMN broker_transactions.settle_date IS 'Fecha de liquidación.';
COMMENT ON COLUMN broker_transactions.type IS 'Tipo de transacción (buy/sell/coupon/dividend/...).';
COMMENT ON COLUMN broker_transactions.instrument_id IS 'Instrumento asociado (si aplica).';
COMMENT ON COLUMN broker_transactions.quantity IS 'Cantidad/nominal de la operación.';
COMMENT ON COLUMN broker_transactions.price IS 'Precio unitario.';
COMMENT ON COLUMN broker_transactions.gross_amount IS 'Importe bruto.';
COMMENT ON COLUMN broker_transactions.fees IS 'Comisiones/costos.';
COMMENT ON COLUMN broker_transactions.net_amount IS 'Importe neto.';
COMMENT ON COLUMN broker_transactions.reference IS 'Referencia/observaciones.';
COMMENT ON COLUMN broker_transactions.external_ref IS 'Referencia externa para conciliación.';
COMMENT ON COLUMN broker_transactions.raw_ref IS 'Referencia cruda/estructura original (jsonb).';
COMMENT ON COLUMN broker_transactions.created_at IS 'Fecha de registro.';

COMMENT ON TABLE broker_positions IS 'Posiciones por cuenta/instrumento en una fecha.';
COMMENT ON COLUMN broker_positions.id IS 'UUID primario.';
COMMENT ON COLUMN broker_positions.broker_account_id IS 'Cuenta asociada.';
COMMENT ON COLUMN broker_positions.as_of_date IS 'Fecha de snapshot.';
COMMENT ON COLUMN broker_positions.instrument_id IS 'Instrumento en posición.';
COMMENT ON COLUMN broker_positions.quantity IS 'Cantidad en posición.';
COMMENT ON COLUMN broker_positions.avg_price IS 'Precio promedio de la posición.';
COMMENT ON COLUMN broker_positions.market_value IS 'Valor de mercado.';

-- ==========================
-- Carteras
-- ==========================
COMMENT ON TABLE portfolio_templates IS 'Plantillas de cartera con nivel de riesgo y composición base.';
COMMENT ON COLUMN portfolio_templates.id IS 'UUID primario.';
COMMENT ON COLUMN portfolio_templates.name IS 'Nombre de la plantilla.';
COMMENT ON COLUMN portfolio_templates.description IS 'Descripción de la plantilla.';
COMMENT ON COLUMN portfolio_templates.risk_level IS 'Nivel de riesgo objetivo (low/mid/high).';
COMMENT ON COLUMN portfolio_templates.created_by_user_id IS 'Usuario creador de la plantilla.';
COMMENT ON COLUMN portfolio_templates.created_at IS 'Fecha de creación.';

COMMENT ON TABLE portfolio_template_lines IS 'Líneas de composición target por clase o instrumento.';
COMMENT ON COLUMN portfolio_template_lines.id IS 'UUID primario.';
COMMENT ON COLUMN portfolio_template_lines.template_id IS 'Plantilla a la que pertenece la línea.';
COMMENT ON COLUMN portfolio_template_lines.target_type IS 'Tipo de target: asset_class o instrument.';
COMMENT ON COLUMN portfolio_template_lines.asset_class IS 'Clase de activo objetivo (si target_type=asset_class).';
COMMENT ON COLUMN portfolio_template_lines.instrument_id IS 'Instrumento objetivo (si target_type=instrument).';
COMMENT ON COLUMN portfolio_template_lines.target_weight IS 'Peso objetivo (0..1).';

COMMENT ON TABLE client_portfolio_assignments IS 'Asignaciones de plantillas a clientes, con estado y vigencia.';
COMMENT ON COLUMN client_portfolio_assignments.id IS 'UUID primario.';
COMMENT ON COLUMN client_portfolio_assignments.contact_id IS 'Cliente/Contacto asignado.';
COMMENT ON COLUMN client_portfolio_assignments.template_id IS 'Plantilla asignada.';
COMMENT ON COLUMN client_portfolio_assignments.status IS 'Estado de la asignación: active/paused/ended.';
COMMENT ON COLUMN client_portfolio_assignments.start_date IS 'Fecha de inicio de la asignación.';
COMMENT ON COLUMN client_portfolio_assignments.end_date IS 'Fecha de fin (si corresponde).';
COMMENT ON COLUMN client_portfolio_assignments.notes IS 'Notas de la asignación.';
COMMENT ON COLUMN client_portfolio_assignments.created_by_user_id IS 'Usuario que realizó la asignación.';
COMMENT ON COLUMN client_portfolio_assignments.created_at IS 'Fecha de creación.';

COMMENT ON TABLE client_portfolio_overrides IS 'Overrides específicos por cliente sobre la plantilla.';
COMMENT ON COLUMN client_portfolio_overrides.id IS 'UUID primario.';
COMMENT ON COLUMN client_portfolio_overrides.assignment_id IS 'Asignación a la que aplica el override.';
COMMENT ON COLUMN client_portfolio_overrides.target_type IS 'asset_class o instrument.';
COMMENT ON COLUMN client_portfolio_overrides.asset_class IS 'Clase de activo objetivo (si corresponde).';
COMMENT ON COLUMN client_portfolio_overrides.instrument_id IS 'Instrumento objetivo (si corresponde).';
COMMENT ON COLUMN client_portfolio_overrides.target_weight IS 'Peso objetivo override (0..1).';

COMMENT ON TABLE portfolio_monitoring_snapshot IS 'Snapshots de monitoreo de desvíos por cliente y fecha.';
COMMENT ON COLUMN portfolio_monitoring_snapshot.id IS 'UUID primario.';
COMMENT ON COLUMN portfolio_monitoring_snapshot.contact_id IS 'Cliente/Contacto monitoreado.';
COMMENT ON COLUMN portfolio_monitoring_snapshot.as_of_date IS 'Fecha del snapshot.';
COMMENT ON COLUMN portfolio_monitoring_snapshot.total_deviation_pct IS 'Desvío total agregado (0..1).';
COMMENT ON COLUMN portfolio_monitoring_snapshot.generated_at IS 'Fecha de generación del snapshot.';

COMMENT ON TABLE portfolio_monitoring_details IS 'Detalle de desvíos por asset/instrumento para un snapshot.';
COMMENT ON COLUMN portfolio_monitoring_details.id IS 'UUID primario.';
COMMENT ON COLUMN portfolio_monitoring_details.snapshot_id IS 'Snapshot al que pertenece.';
COMMENT ON COLUMN portfolio_monitoring_details.target_type IS 'Tipo de target (asset_class/instrument).';
COMMENT ON COLUMN portfolio_monitoring_details.asset_class IS 'Clase de activo (si aplica).';
COMMENT ON COLUMN portfolio_monitoring_details.instrument_id IS 'Instrumento (si aplica).';
COMMENT ON COLUMN portfolio_monitoring_details.target_weight IS 'Peso objetivo (0..1).';
COMMENT ON COLUMN portfolio_monitoring_details.actual_weight IS 'Peso real observado (0..1).';
COMMENT ON COLUMN portfolio_monitoring_details.deviation_pct IS 'Desvío observado (0..1).';

-- ==========================
-- Reportes y métricas
-- ==========================
COMMENT ON TABLE scheduled_reports IS 'Programación de reportes (diarios/semanales) con owner y parámetros.';
COMMENT ON COLUMN scheduled_reports.id IS 'UUID primario.';
COMMENT ON COLUMN scheduled_reports.name IS 'Nombre del reporte programado.';
COMMENT ON COLUMN scheduled_reports.type IS 'Tipo de reporte (daily_advisor/daily_manager/weekly_manager).';
COMMENT ON COLUMN scheduled_reports.schedule_cron IS 'Expresión cron de ejecución.';
COMMENT ON COLUMN scheduled_reports.timezone IS 'Zona horaria para programar la ejecución.';
COMMENT ON COLUMN scheduled_reports.next_run_at IS 'Próxima ejecución planificada.';
COMMENT ON COLUMN scheduled_reports.last_run_at IS 'Última ejecución realizada.';
COMMENT ON COLUMN scheduled_reports.owner_user_id IS 'Usuario dueño del reporte.';
COMMENT ON COLUMN scheduled_reports.targets IS 'Destinatarios u objeto del reporte (jsonb).';
COMMENT ON COLUMN scheduled_reports.params IS 'Parámetros de generación (jsonb).';
COMMENT ON COLUMN scheduled_reports.enabled IS 'Si el reporte está habilitado.';
COMMENT ON COLUMN scheduled_reports.created_at IS 'Fecha de creación.';

COMMENT ON TABLE report_runs IS 'Ejecuciones de reportes con estado y resumen de entrega.';
COMMENT ON COLUMN report_runs.id IS 'UUID primario.';
COMMENT ON COLUMN report_runs.scheduled_report_id IS 'Reporte programado asociado.';
COMMENT ON COLUMN report_runs.run_at IS 'Fecha/hora de ejecución.';
COMMENT ON COLUMN report_runs.status IS 'Estado: success o failed.';
COMMENT ON COLUMN report_runs.delivery_summary IS 'Resumen de entrega/envío (jsonb).';
COMMENT ON COLUMN report_runs.created_at IS 'Fecha de creación del registro.';

COMMENT ON TABLE activity_events IS 'Eventos de actividad para dashboards y auditoría funcional.';
COMMENT ON COLUMN activity_events.id IS 'UUID primario.';
COMMENT ON COLUMN activity_events.user_id IS 'Usuario que originó el evento.';
COMMENT ON COLUMN activity_events.advisor_user_id IS 'Asesor responsable (denormalizado para reportes).';
COMMENT ON COLUMN activity_events.contact_id IS 'Contacto relacionado (si existe).';
COMMENT ON COLUMN activity_events.type IS 'Tipo de evento (note_created, meeting_added, etc.).';
COMMENT ON COLUMN activity_events.metadata IS 'Metadatos específicos del evento (jsonb).';
COMMENT ON COLUMN activity_events.occurred_at IS 'Fecha/hora del evento.';

COMMENT ON TABLE daily_metrics_user IS 'Métricas diarias por usuario para dashboards y reportes.';
COMMENT ON COLUMN daily_metrics_user.id IS 'UUID primario.';
COMMENT ON COLUMN daily_metrics_user.user_id IS 'Usuario al que pertenecen las métricas.';
COMMENT ON COLUMN daily_metrics_user.team_id IS 'Equipo del usuario (denormalizado).';
COMMENT ON COLUMN daily_metrics_user.date IS 'Fecha de referencia de las métricas.';
COMMENT ON COLUMN daily_metrics_user.num_new_prospects IS 'Cantidad de nuevos prospectos.';
COMMENT ON COLUMN daily_metrics_user.num_contacts_touched IS 'Contactos con actividad realizada.';
COMMENT ON COLUMN daily_metrics_user.num_notes IS 'Notas creadas.';
COMMENT ON COLUMN daily_metrics_user.num_meetings IS 'Reuniones registradas.';
COMMENT ON COLUMN daily_metrics_user.num_tasks_completed IS 'Tareas completadas.';
COMMENT ON COLUMN daily_metrics_user.aum_total IS 'AUM total administrado por el usuario.';
COMMENT ON COLUMN daily_metrics_user.liquid_balance_total IS 'Saldo líquido agregado por el usuario.';
COMMENT ON COLUMN daily_metrics_user.generated_at IS 'Fecha de generación del registro.';

COMMENT ON TABLE aum_snapshots IS 'Snapshots de AUM por cliente en una fecha.';
COMMENT ON COLUMN aum_snapshots.id IS 'UUID primario.';
COMMENT ON COLUMN aum_snapshots.contact_id IS 'Cliente/Contacto.';
COMMENT ON COLUMN aum_snapshots.date IS 'Fecha del snapshot.';
COMMENT ON COLUMN aum_snapshots.aum_total IS 'AUM total en la fecha.';

-- ==========================
-- Auditoría y alertas
-- ==========================
COMMENT ON TABLE audit_logs IS 'Auditoría técnica de acciones con contexto JSON.';
COMMENT ON COLUMN audit_logs.id IS 'UUID primario.';
COMMENT ON COLUMN audit_logs.actor_user_id IS 'Usuario actor de la acción.';
COMMENT ON COLUMN audit_logs.action IS 'Acción realizada.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Tipo de entidad afectada.';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID de la entidad afectada.';
COMMENT ON COLUMN audit_logs.context IS 'Contexto adicional (jsonb).';
COMMENT ON COLUMN audit_logs.created_at IS 'Fecha/hora de registro.';

COMMENT ON TABLE alert_policies IS 'Políticas de alertas configurables por scope (usuario/equipo/global).';
COMMENT ON COLUMN alert_policies.id IS 'UUID primario.';
COMMENT ON COLUMN alert_policies.scope IS 'Ámbito: user, team o global.';
COMMENT ON COLUMN alert_policies.scope_id IS 'ID del ámbito (NULL para global).';
COMMENT ON COLUMN alert_policies.type IS 'Tipo de alerta (saldo_liquido, desvio_cartera, inactividad).';
COMMENT ON COLUMN alert_policies.params IS 'Parámetros de la política (jsonb).';
COMMENT ON COLUMN alert_policies.enabled IS 'Si la política está activa.';


