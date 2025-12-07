/**
 * Schema exports - Mantiene compatibilidad con imports existentes
 * 
 * AI_DECISION: Refactorización de schema.ts monolítico (1759 líneas) a módulos por dominio
 * Justificación: Mejor organización, navegabilidad y mantenibilidad del código
 * Impacto: Los imports existentes siguen funcionando - este archivo ahora re-exporta desde schema/
 * 
 * AI_DECISION: Eliminar barrel exports (export *) para mejorar tree-shaking
 * Justificación: Los barrel exports rompen tree-shaking y aumentan el bundle size
 * Impacto: Mejor optimización de bundle, imports más explícitos
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

// Catálogos (lookup tables)
export {
  lookupAssetClass,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType
} from './schema/lookups';

// Usuarios, equipos y configuraciones
export {
  teams,
  users,
  teamMembership,
  teamMembershipRequests,
  advisorAliases,
  careerPlanLevels
} from './schema/users';

// Contactos, pipeline, etiquetas y segmentos
export {
  pipelineStages,
  contacts,
  contactFieldHistory,
  pipelineStageHistory,
  tags,
  tagRules,
  segments,
  segmentMembers,
  contactTags
} from './schema/contacts';

// Notas, archivos de audio, adjuntos, tareas
export {
  audioFiles,
  notes,
  attachments,
  noteTags,
  taskRecurrences,
  tasks
} from './schema/notes-tasks';

// Notificaciones y mensajería
export {
  notificationTemplates,
  notifications,
  userChannelPreferences,
  messageLog
} from './schema/notifications';

// Instrumentos financieros
export {
  instruments,
  instrumentAliases
} from './schema/instruments';

// Integración Broker
export {
  integrationAccounts,
  integrationJobs,
  integrationRuns,
  integrationFiles,
  brokerAccounts,
  brokerBalances,
  brokerTransactions,
  brokerPositions
} from './schema/broker';

// AUM Imports
export {
  aumImportFiles,
  aumImportRows,
  advisorAccountMapping,
  aumMonthlySnapshots
} from './schema/aum';

// Carteras
export {
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  clientPortfolioOverrides,
  portfolioMonitoringSnapshot,
  portfolioMonitoringDetails
} from './schema/portfolios';

// Reportes y métricas
export {
  scheduledReports,
  reportRuns,
  activityEvents,
  dailyMetricsUser,
  monthlyGoals,
  aumSnapshots
} from './schema/reports';

// Auditoría y alertas
export {
  auditLogs,
  alertPolicies
} from './schema/audit';

// Benchmarks y precios
export {
  benchmarkDefinitions,
  benchmarkComponents,
  priceSnapshots,
  pricesDaily,
  pricesIntraday,
  metricDefinitions
} from './schema/benchmarks';

// Capacitaciones
export { capacitaciones } from './schema/capacitaciones';

// Automatizaciones
export { automationConfigs } from './schema/automations';
