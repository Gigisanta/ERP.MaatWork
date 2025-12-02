/**
 * Schema barrel export - Mantiene compatibilidad con imports existentes
 * 
 * AI_DECISION: Refactorización de schema.ts monolítico (1759 líneas) a módulos por dominio
 * Justificación: Mejor organización, navegabilidad y mantenibilidad del código
 * Impacto: Los imports existentes siguen funcionando - este archivo ahora re-exporta desde schema/
 * 
 * Estructura modular:
 * - schema/lookups.ts - Catálogos (lookup tables)
 * - schema/users.ts - Usuarios, equipos, membresías
 * - schema/contacts.ts - Contactos, pipeline, tags, segmentos
 * - schema/notes-tasks.ts - Notas, adjuntos, tareas, recurrencias
 * - schema/notifications.ts - Notificaciones, plantillas, mensajería
 * - schema/instruments.ts - Instrumentos financieros
 * - schema/broker.ts - Integración broker, transacciones, posiciones
 * - schema/aum.ts - AUM imports y snapshots
 * - schema/portfolios.ts - Carteras, asignaciones, monitoreo
 * - schema/reports.ts - Reportes, métricas, eventos
 * - schema/audit.ts - Auditoría, alertas
 * - schema/benchmarks.ts - Benchmarks, precios, métricas financieras
 * - schema/capacitaciones.ts - Capacitaciones
 * - schema/automations.ts - Automatizaciones
 */

export * from './schema/index';
