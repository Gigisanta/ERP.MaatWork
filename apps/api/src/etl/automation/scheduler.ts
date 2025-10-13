/**
 * Scheduler para jobs automáticos de ETL
 * Implementa STORY 8 - KAN-129
 */

/**
 * Configuración de un job programado
 */
export interface ScheduledJob {
  id: string;
  name: string;
  type: 'download_reports' | 'run_matching' | 'cleanup' | 'alerts';
  scheduleCron: string; // Cron expression
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  config?: Record<string, any>;
}

/**
 * Resultado de ejecución de un job
 */
export interface JobRunResult {
  jobId: string;
  startedAt: Date;
  finishedAt: Date;
  status: 'success' | 'warning' | 'failed';
  error?: string;
  stats: Record<string, any>;
}

/**
 * Parser de expresiones cron simples
 * Formato: "0 9 * * *" = 9 AM diario
 */
export function parseCron(cronExp: string): { hour: number; minute: number } {
  const parts = cronExp.split(' ');
  if (parts.length < 2) {
    throw new Error('Invalid cron expression');
  }
  
  return {
    minute: parseInt(parts[0], 10),
    hour: parseInt(parts[1], 10)
  };
}

/**
 * Calcula próxima ejecución basado en cron
 */
export function getNextRun(cronExp: string, from: Date = new Date()): Date {
  const { hour, minute } = parseCron(cronExp);
  
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  
  // Si ya pasó hoy, programar para mañana
  if (next <= from) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Jobs predefinidos del sistema
 */
export const DEFAULT_JOBS: ScheduledJob[] = [
  {
    id: 'daily-matching',
    name: 'Matching diario automático',
    type: 'run_matching',
    scheduleCron: '0 2 * * *', // 2 AM
    enabled: true,
    config: {
      fuzzyEnabled: true,
      fuzzyThreshold: 2
    }
  },
  {
    id: 'daily-alerts',
    name: 'Verificación diaria de alertas',
    type: 'alerts',
    scheduleCron: '0 8 * * *', // 8 AM
    enabled: true,
    config: {
      notifyChannels: ['email', 'slack']
    }
  },
  {
    id: 'weekly-cleanup',
    name: 'Limpieza semanal de staging',
    type: 'cleanup',
    scheduleCron: '0 0 * * 0', // Domingo medianoche
    enabled: false,
    config: {
      retentionDays: 30
    }
  }
];

/**
 * Ejecutor de job de matching automático
 */
export async function executeMatchingJob(
  config: Record<string, any>
): Promise<JobRunResult> {
  const startedAt = new Date();
  
  try {
    const { runMatchingJob } = await import('../matching/run-matching');
    
    const result = await runMatchingJob({
      fuzzyEnabled: config.fuzzyEnabled ?? true,
      fuzzyThreshold: config.fuzzyThreshold ?? 2
    });
    
    const finishedAt = new Date();
    
    return {
      jobId: 'daily-matching',
      startedAt,
      finishedAt,
      status: result.errors.length > 0 ? 'warning' : 'success',
      stats: {
        totalProcessed: result.totalProcessed,
        matched: result.matched,
        pending: result.pending,
        matchRate: result.metrics.matchRate
      }
    };
  } catch (error) {
    const finishedAt = new Date();
    
    return {
      jobId: 'daily-matching',
      startedAt,
      finishedAt,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      stats: {}
    };
  }
}

/**
 * Ejecutor de job de alertas
 */
export async function executeAlertsJob(
  config: Record<string, any>
): Promise<JobRunResult> {
  const startedAt = new Date();
  
  try {
    const { checkAlerts } = await import('../observability/dashboard');
    
    const alerts = await checkAlerts();
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    
    // TODO: Enviar notificaciones a canales configurados
    // Placeholder para integración con email/slack
    if (alerts.length > 0) {
      console.log(`[ALERTS] ${alerts.length} alertas detectadas:`, alerts);
    }
    
    const finishedAt = new Date();
    
    return {
      jobId: 'daily-alerts',
      startedAt,
      finishedAt,
      status: criticalCount > 0 ? 'warning' : 'success',
      stats: {
        totalAlerts: alerts.length,
        critical: criticalCount,
        warning: warningCount
      }
    };
  } catch (error) {
    const finishedAt = new Date();
    
    return {
      jobId: 'daily-alerts',
      startedAt,
      finishedAt,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      stats: {}
    };
  }
}

/**
 * Ejecutor de job de limpieza
 */
export async function executeCleanupJob(
  config: Record<string, any>
): Promise<JobRunResult> {
  const startedAt = new Date();
  
  try {
    const retentionDays = config.retentionDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // TODO: Implementar limpieza de staging tables
    // DELETE FROM stg_* WHERE created_at < cutoffDate AND processed = true
    
    const finishedAt = new Date();
    
    return {
      jobId: 'weekly-cleanup',
      startedAt,
      finishedAt,
      status: 'success',
      stats: {
        deletedRows: 0, // Placeholder
        retentionDays
      }
    };
  } catch (error) {
    const finishedAt = new Date();
    
    return {
      jobId: 'weekly-cleanup',
      startedAt,
      finishedAt,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      stats: {}
    };
  }
}

/**
 * Ejecuta un job según su tipo
 */
export async function executeJob(job: ScheduledJob): Promise<JobRunResult> {
  switch (job.type) {
    case 'run_matching':
      return executeMatchingJob(job.config || {});
    case 'alerts':
      return executeAlertsJob(job.config || {});
    case 'cleanup':
      return executeCleanupJob(job.config || {});
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

/**
 * Manager de jobs programados
 * En producción se debería usar un cron real o sistema de colas (BullMQ, etc.)
 */
export class JobScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    // Cargar jobs por defecto
    DEFAULT_JOBS.forEach(job => {
      this.jobs.set(job.id, job);
    });
  }
  
  /**
   * Inicia el scheduler
   */
  start() {
    console.log('[JobScheduler] Starting...');
    
    this.jobs.forEach(job => {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    });
  }
  
  /**
   * Detiene el scheduler
   */
  stop() {
    console.log('[JobScheduler] Stopping...');
    
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
  
  /**
   * Programa un job para su próxima ejecución
   */
  private scheduleJob(job: ScheduledJob) {
    const nextRun = getNextRun(job.scheduleCron);
    const delay = nextRun.getTime() - Date.now();
    
    console.log(`[JobScheduler] Scheduling "${job.name}" for ${nextRun.toISOString()}`);
    
    const timer = setTimeout(async () => {
      await this.runJob(job);
      // Re-programar para la próxima ejecución
      this.scheduleJob(job);
    }, delay);
    
    this.timers.set(job.id, timer);
    
    // Actualizar nextRunAt
    job.nextRunAt = nextRun;
  }
  
  /**
   * Ejecuta un job inmediatamente
   */
  async runJob(job: ScheduledJob): Promise<JobRunResult> {
    console.log(`[JobScheduler] Running job "${job.name}"...`);
    
    const result = await executeJob(job);
    
    // Actualizar lastRunAt
    job.lastRunAt = result.startedAt;
    
    console.log(`[JobScheduler] Job "${job.name}" completed with status: ${result.status}`);
    
    // TODO: Guardar resultado en integration_runs
    
    return result;
  }
  
  /**
   * Lista todos los jobs
   */
  listJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }
  
  /**
   * Habilita/deshabilita un job
   */
  toggleJob(jobId: string, enabled: boolean) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    
    job.enabled = enabled;
    
    if (enabled) {
      this.scheduleJob(job);
    } else {
      const timer = this.timers.get(jobId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(jobId);
      }
    }
  }
}

// Singleton instance
let schedulerInstance: JobScheduler | null = null;

export function getScheduler(): JobScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new JobScheduler();
  }
  return schedulerInstance;
}




