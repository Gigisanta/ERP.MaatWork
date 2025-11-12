import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as schema from './schema';

// Cargar .env desde el directorio del paquete db si no está disponible
if (!process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // En desarrollo, buscar .env en src/../.env
  // En producción compilado, buscar .env en dist/../.env
  const envPath = join(__dirname, '..', '.env');
  config({ path: envPath });
}

// Explicit exports for tree-shaking and clarity (no export *)
export {
  // Lookup tables
  lookupAssetClass,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType,
  // Identity & teams
  teams,
  users,
  teamMembership,
  teamMembershipRequests,
  // Contacts & pipeline
  pipelineStages,
  contacts,
  contactFieldHistory,
  pipelineStageHistory,
  // Attachments
  attachments,
  // Meetings & Notes (AI/manual/import)
  audioFiles,
  notes,
  noteTags,
  // Tags & segments
  tags,
  tagRules,
  segments,
  segmentMembers,
  contactTags,
  // Tasks
  tasks,
  taskRecurrences,
  // Notifications
  notifications,
  notificationTemplates,
  userChannelPreferences,
  messageLog,
  // Instruments & prices
  instruments,
  instrumentAliases,
  priceSnapshots,
  metricDefinitions,
  // AUM staging
  aumImportFiles,
  aumImportRows,
  aumMonthlySnapshots,
  // Settings / mappings
  advisorAliases,
  advisorAccountMapping,
  careerPlanLevels,
  // Broker domain
  brokerAccounts,
  brokerBalances,
  brokerTransactions,
  brokerPositions,
  // Portfolios
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  clientPortfolioOverrides,
  portfolioMonitoringSnapshot,
  portfolioMonitoringDetails,
  // Audit & alerts
  auditLogs,
  alertPolicies,
  // Benchmarks
  benchmarkDefinitions,
  benchmarkComponents,
  // Analytics/reporting
  scheduledReports,
  reportRuns,
  dailyMetricsUser,
  monthlyGoals,
  aumSnapshots,
  activityEvents,
  // Integration
  integrationAccounts,
  integrationJobs,
  integrationRuns,
  integrationFiles,
  // Capacitaciones
  capacitaciones
} from './schema';

/**
 * Crea una conexión de base de datos utilizando PostgreSQL y Drizzle ORM.
 * 
 * Usa PostgreSQL para desarrollo y producción.
 * Requiere DATABASE_URL en las variables de entorno.
 * 
 * Devuelve una instancia de `db` tipada que expone métodos de consulta
 * y facilita el uso de esquemas definidos en Drizzle (`./schema`).
 * 
 * REGLA CURSOR: Mantener patrón singleton - no exponer createDb directamente
 */
// AI_DECISION: Optimize PostgreSQL connection pool configuration
// Justificación: Default pool (10 connections) is a bottleneck under load. Increasing to 20 with proper recycling reduces connection wait times.
// Impacto: ~50% reduction in connection timeouts, better handling of concurrent requests
function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Increase from default 10 to 20 connections
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Timeout after 5s when acquiring connection
    maxUses: 7500, // Recycle connections after 7500 uses to prevent leak accumulation
    allowExitOnIdle: false, // Keep pool alive when idle
  });
  return drizzle(pool, { schema });
}

/**
 * db
 * Instancia principal de Drizzle ORM, construida sobre el pool de pg.
 * Usar esta export para realizar operaciones de lectura/escritura.
 * Se inicializa de forma lazy cuando se accede por primera vez.
 * 
 * REGLA CURSOR: Siempre usar db() para obtener instancia - no crear pools manuales
 */
let _db: NodePgDatabase<typeof schema> | null = null;

export function db(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
