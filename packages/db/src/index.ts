import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as schema from './schema';

// Obtener __dirname compatible con ES modules y CommonJS
// AI_DECISION: Usar verificación condicional para detectar el tipo de módulo
// Justificación: tsx ejecuta como ES modules (import.meta disponible), pero TypeScript compila a CommonJS (__dirname disponible)
// Impacto: Funciona tanto cuando se ejecuta directamente con tsx como cuando se compila a CommonJS
const moduleDir = (() => {
  // Verificar si estamos en un módulo ES (tsx ejecuta directamente)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // Si import.meta no está disponible, continuar
  }
  // Fallback para CommonJS (cuando se compila)
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // Último recurso
  return process.cwd();
})();

// Cargar .env desde el directorio del paquete db si no está disponible
if (!process.env.DATABASE_URL) {
  // En desarrollo, buscar .env en src/../.env
  // En producción compilado, buscar .env en dist/../.env
  const envPath = join(moduleDir, '..', '.env');
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
  teamGoals,
  // OAuth
  googleOAuthTokens,
  // Contacts & pipeline
  pipelineStages,
  contacts,
  contactAliases,
  contactFieldHistory,
  pipelineStageHistory,
  contactStageInteractions,
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
  pricesDaily,
  pricesIntraday,
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
  portfolios,
  portfolioLines,
  clientPortfolioAssignments,
  clientPortfolioOverrides,
  portfolioMonitoringSnapshot,
  portfolioMonitoringDetails,
  // Audit & alerts
  auditLogs,
  alertPolicies,
  // Benchmarks
  // Benchmarks unified into portfolios
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
  capacitaciones,
  // Automatizaciones
  automationConfigs,
  // Calendar
  calendarEvents,
  // User Feedback
  feedback,
  feedbackTypeEnum,
  feedbackStatusEnum,
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
// AI_DECISION: Optimize PostgreSQL connection pool configuration for memory efficiency
// Justificación: Reducing connections from 20 to 15 reduces memory per connection (~25% reduction).
//                Shorter idle timeout (20s vs 30s) releases connections faster, preventing memory accumulation.
//                Statement timeout prevents hung queries from holding connections indefinitely.
// Impacto: ~25% reduction in connection pool memory usage, faster connection recycling
function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // AI_DECISION: SSL condicional basado en ambiente
  // Justificación: PostgreSQL local (Docker) no soporta SSL, pero AWS RDS lo requiere
  // Impacto: Permite desarrollo local sin SSL y producción con SSL automáticamente
  const databaseUrl = process.env.DATABASE_URL;
  const isLocalDatabase =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.includes('::1');

  // Solo usar SSL en producción o para bases de datos remotas
  const shouldUseSSL = process.env.NODE_ENV === 'production' || !isLocalDatabase;

  const sslConfig = shouldUseSSL
    ? {
      rejectUnauthorized: false, // Accept self-signed certificates (for RDS)
    }
    : undefined;

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 15, // Reduced from 20 to 15 connections (less memory per connection)
    idleTimeoutMillis: 20000, // Close idle connections after 20s (reduced from 30s)
    connectionTimeoutMillis: 5000, // Timeout after 5s when acquiring connection
    maxUses: 7500, // Recycle connections after 7500 uses to prevent leak accumulation
    allowExitOnIdle: false, // Keep pool alive when idle
    // AI_DECISION: Add statement timeout to prevent hung queries
    // Justificación: Prevents queries from holding connections indefinitely, freeing memory faster
    // Impacto: Prevents memory leaks from hung queries
    statement_timeout: 30000, // 30 seconds max query execution time
    ...(sslConfig && { ssl: sslConfig }), // Only include SSL config if needed
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

// Re-export read replica functions
export { readReplicaDb, hasReadReplica } from './read-replica';
