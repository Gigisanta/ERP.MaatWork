/**
 * Schema barrel export - mantiene compatibilidad con imports existentes
 * 
 * AI_DECISION: Refactorización de schema.ts monolítico (1759 líneas) en módulos por dominio
 * Justificación: Mejor organización, navegabilidad y mantenibilidad del código
 * Impacto: Los imports existentes siguen funcionando vía barrel exports
 */

// Catálogos (lookup tables)
export {
  lookupAssetClass,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType
} from './lookups';

// Usuarios, equipos y configuraciones
export {
  teams,
  users,
  teamMembership,
  teamMembershipRequests,
  advisorAliases,
  careerPlanLevels
} from './users';

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
} from './contacts';

// Notas, archivos de audio, adjuntos, tareas
export {
  audioFiles,
  notes,
  attachments,
  noteTags,
  taskRecurrences,
  tasks
} from './notes-tasks';

// Notificaciones y mensajería
export {
  notificationTemplates,
  notifications,
  userChannelPreferences,
  messageLog
} from './notifications';

// Instrumentos financieros
export {
  instruments,
  instrumentAliases
} from './instruments';

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
} from './broker';

// AUM Imports
export {
  aumImportFiles,
  aumImportRows,
  advisorAccountMapping,
  aumMonthlySnapshots
} from './aum';

// Carteras
export {
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  clientPortfolioOverrides,
  portfolioMonitoringSnapshot,
  portfolioMonitoringDetails
} from './portfolios';

// Reportes y métricas
export {
  scheduledReports,
  reportRuns,
  activityEvents,
  dailyMetricsUser,
  monthlyGoals,
  aumSnapshots
} from './reports';

// Auditoría y alertas
export {
  auditLogs,
  alertPolicies
} from './audit';

// Benchmarks y precios
export {
  benchmarkDefinitions,
  benchmarkComponents,
  priceSnapshots,
  pricesDaily,
  pricesIntraday,
  metricDefinitions
} from './benchmarks';

// Capacitaciones
export { capacitaciones } from './capacitaciones';

// Automatizaciones
export { automationConfigs } from './automations';

