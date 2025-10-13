'use client';

/**
 * Dashboard de Observabilidad - Métricas SLO y Alertas
 */

import { useState, useEffect } from 'react';

interface Metric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: string;
}

interface Alert {
  id: string;
  severity: 'warning' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

interface Dashboard {
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

export default function ETLDashboardPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000); // Refresh cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/etl/dashboard`);
      const data = await res.json();
      setDashboard(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  if (!dashboard || !dashboard.summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-xl font-bold mb-2">Error al cargar dashboard</div>
          <div className="text-sm text-gray-600">
            {!dashboard ? 'No se pudo conectar con la API' : 'Datos de dashboard incompletos'}
          </div>
          <button
            onClick={loadDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  const metricStatusColors = {
    ok: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    critical: 'text-red-600 bg-red-50'
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📊 Dashboard de Observabilidad
              </h1>
              <p className="text-gray-600">
                Métricas SLO y alertas del sistema ETL
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full ${statusColors[dashboard.summary.overallStatus]} text-white font-semibold`}>
                {dashboard.summary.overallStatus.toUpperCase()}
              </div>
              <button
                onClick={loadDashboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Métricas</div>
            <div className="text-2xl font-bold text-blue-600">
              {dashboard.summary.totalMetrics}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Alertas Críticas</div>
            <div className="text-2xl font-bold text-red-600">
              {dashboard.summary.criticalAlerts}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Alertas Warning</div>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboard.summary.warningAlerts}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Estado General</div>
            <div className={`text-2xl font-bold ${
              dashboard.summary.overallStatus === 'healthy' ? 'text-green-600' :
              dashboard.summary.overallStatus === 'degraded' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {dashboard.summary.overallStatus === 'healthy' ? '✅ OK' :
               dashboard.summary.overallStatus === 'degraded' ? '⚠️ Degraded' :
               '🚨 Critical'}
            </div>
          </div>
        </div>

        {/* Alertas */}
        {dashboard.alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🚨 Alertas Activas
            </h2>
            <div className="space-y-3">
              {dashboard.alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'critical' 
                      ? 'bg-red-50 border-red-500' 
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {alert.severity === 'critical' ? '🚨' : '⚠️'} {alert.metric}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {alert.message}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        Valor: <span className="font-bold">{alert.value}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Threshold: {alert.threshold}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métricas por categoría */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Latency */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ⏱️ Latencia
            </h2>
            <div className="space-y-3">
              {dashboard.metrics.latency.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">{metric.name}</div>
                    {metric.threshold && (
                      <div className="text-xs text-gray-500">
                        Threshold: {metric.threshold}{metric.unit}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${metricStatusColors[metric.status]}`}>
                      {metric.value.toFixed(0)}{metric.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matching */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              🔄 Matching
            </h2>
            <div className="space-y-3">
              {dashboard.metrics.matching.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">{metric.name}</div>
                    {metric.threshold !== undefined && (
                      <div className="text-xs text-gray-500">
                        Threshold: {metric.threshold}{metric.unit}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${metricStatusColors[metric.status]}`}>
                      {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}{metric.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ✅ Calidad de Datos
            </h2>
            <div className="space-y-3">
              {dashboard.metrics.quality.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">{metric.name}</div>
                    {metric.threshold && (
                      <div className="text-xs text-gray-500">
                        Max: {metric.threshold}{metric.unit}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${metricStatusColors[metric.status]}`}>
                      {metric.value}{metric.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              📦 Volumen
            </h2>
            <div className="space-y-3">
              {dashboard.metrics.volume.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="font-medium text-gray-900">{metric.name}</div>
                  <div className="text-lg font-bold text-blue-600">
                    {metric.value.toLocaleString()} {metric.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SLO Reference */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">📐 SLO de Referencia</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-blue-600 font-medium">Vistas p95</div>
              <div className="text-blue-900 font-bold">&lt; 1000ms</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">Integraciones p95</div>
              <div className="text-blue-900 font-bold">&lt; 3000ms</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">Matched Rate</div>
              <div className="text-blue-900 font-bold">≥ 95%</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">DLQ Count</div>
              <div className="text-blue-900 font-bold">= 0</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">Éxito Ingesta</div>
              <div className="text-blue-900 font-bold">&gt; 99.5%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

