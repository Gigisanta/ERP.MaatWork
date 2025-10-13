/**
 * Dashboard de observabilidad - FALLBACK para casos de error
 * Retorna datos mock cuando la DB no está disponible
 */

export interface Metric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: string;
}

export interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface Dashboard {
  metrics: {
    latency: Metric[];
    quality: Metric[];
    matching: Metric[];
    volume: Metric[];
  };
  alerts: Alert[];
  summary: {
    totalMetrics: number;
    criticalAlerts: number;
    warningAlerts: number;
    overallStatus: 'healthy' | 'degraded' | 'critical';
  };
}

/**
 * Retorna dashboard con datos mock cuando hay errores de DB
 */
export function getFallbackDashboard(): Dashboard {
  const now = new Date().toISOString();
  
  return {
    metrics: {
      latency: [
        {
          name: 'etl_p95_ms',
          value: 2500,
          unit: 'ms',
          threshold: 3000,
          status: 'ok',
          timestamp: now
        },
        {
          name: 'views_p95_ms',
          value: 800,
          unit: 'ms',
          threshold: 1000,
          status: 'ok',
          timestamp: now
        }
      ],
      quality: [
        {
          name: 'nulls_count',
          value: 0,
          unit: 'rows',
          threshold: 10,
          status: 'ok',
          timestamp: now
        },
        {
          name: 'dupes_count',
          value: 2,
          unit: 'rows',
          threshold: 5,
          status: 'ok',
          timestamp: now
        }
      ],
      matching: [
        {
          name: 'matched_rate',
          value: 96.5,
          unit: '%',
          threshold: 95.0,
          status: 'ok',
          timestamp: now
        },
        {
          name: 'pending_matches',
          value: 15,
          unit: 'cases',
          threshold: 100,
          status: 'ok',
          timestamp: now
        }
      ],
      volume: [
        {
          name: 'rows_processed',
          value: 12543,
          unit: 'rows',
          status: 'ok',
          timestamp: now
        },
        {
          name: 'files_processed',
          value: 3,
          unit: 'files',
          status: 'ok',
          timestamp: now
        },
        {
          name: 'dlq_count',
          value: 0,
          unit: 'events',
          threshold: 0,
          status: 'ok',
          timestamp: now
        }
      ]
    },
    alerts: [
      {
        id: 'demo_warning',
        severity: 'warning',
        metric: 'system_load',
        message: 'Sistema funcionando en modo demo con datos mock',
        value: 1,
        threshold: 0,
        timestamp: now
      }
    ],
    summary: {
      totalMetrics: 9,
      criticalAlerts: 0,
      warningAlerts: 1,
      overallStatus: 'degraded'
    }
  };
}
