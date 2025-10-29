"use client";
import { useRequireAuth } from '../auth/useRequireAuth';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardData {
  role: string;
  kpis: {
    totalAum?: number;
    teamAum?: number;
    globalAum?: number;
    clientsWithPortfolio?: number;
    deviationAlerts?: number;
    activeTemplates?: number;
    clientsWithoutPortfolio?: number;
    instrumentsWithoutPrice?: number;
  };
  riskDistribution?: Array<{
    riskLevel: string;
    count: number;
  }>;
  topClients?: Array<{
    contactId: string;
    contactName: string;
    aum: number;
  }>;
  aumTrend?: Array<{
    date: string;
    value: number;
  }>;
}

export default function AnalyticsPage() {
  const { user, token, loading } = useRequireAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchDashboardData = async () => {
    if (!token) return;
    
    try {
      setDataLoading(true);
      
      const response = await fetch(`${apiUrl}/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getRiskLevelLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'Conservador';
      case 'mid': return 'Balanceado';
      case 'high': return 'Agresivo';
      default: return riskLevel;
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'var(--color-success)';
      case 'mid': return 'var(--color-warning)';
      case 'high': return 'var(--color-error)';
      default: return 'var(--color-text-muted)';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p>Cargando...</p>
      </div>
      </div>
    );
  }

  return (
    <main className="p-4 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📊 Analytics Dashboard</h1>
        <div className="flex gap-4 items-center">
          <Link href="/" className="text-info">← Volver al inicio</Link>
          <span className="text-text-muted">|</span>
          <span className="text-sm text-text-muted">
            Vista: {user?.role === 'advisor' ? 'Asesor' : user?.role === 'manager' ? 'Manager' : 'Administrador'}
          </span>
        </div>
      </div>

      {loading && (
        <div className="text-center p-10">
          <p>Cargando dashboard...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-error-subtle border border-error-subtle rounded-lg text-error">
          Error: {error}
        </div>
      )}

      {!loading && !error && dashboardData && (
        <div className="flex flex-col gap-6">
          {/* Cards de KPIs principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dashboardData.role === 'advisor' && (
              <>
                <div className="p-5 bg-info-subtle border border-info-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-info mb-2">
                    AUM Total Clientes
                  </h3>
                  <div className="text-2xl font-bold text-info">
                    {formatCurrency(dashboardData.kpis.totalAum || 0)}
                  </div>
                </div>

                <div className="p-5 bg-success-subtle border border-success-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-success mb-2">
                    Clientes con Cartera
                  </h3>
                  <div className="text-2xl font-bold text-success">
                    {dashboardData.kpis.clientsWithPortfolio || 0}
                  </div>
                </div>

                <div className={`p-5 rounded-xl text-center ${
                  dashboardData.kpis.deviationAlerts && dashboardData.kpis.deviationAlerts > 0 
                    ? 'bg-error-subtle border border-error-subtle' 
                    : 'bg-success-subtle border border-success-subtle'
                }`}>
                  <h3 className={`text-sm font-semibold mb-2 ${
                    dashboardData.kpis.deviationAlerts && dashboardData.kpis.deviationAlerts > 0 
                      ? 'text-error' 
                      : 'text-success'
                  }`}>
                    Alertas de Desvío
                  </h3>
                  <div className={`text-2xl font-bold ${
                    dashboardData.kpis.deviationAlerts && dashboardData.kpis.deviationAlerts > 0 
                      ? 'text-error' 
                      : 'text-success'
                  }`}>
                    {dashboardData.kpis.deviationAlerts || 0}
                  </div>
                </div>
              </>
            )}

            {dashboardData.role === 'manager' && (
              <>
                <div className="p-5 bg-info-subtle border border-info-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-info mb-2">
                    AUM Total Equipo
                  </h3>
                  <div className="text-2xl font-bold text-info">
                    {formatCurrency(dashboardData.kpis.teamAum || 0)}
                  </div>
                </div>

                {dashboardData.riskDistribution && dashboardData.riskDistribution.length > 0 && (
                  <div className="p-5 bg-warning-subtle border border-warning-subtle rounded-xl">
                    <h3 className="text-sm font-semibold text-warning mb-3 text-center">
                      Distribución de Riesgo
                    </h3>
                    <div className="flex flex-col gap-2">
                      {dashboardData.riskDistribution.map((item) => (
                        <div key={item.riskLevel} className="flex justify-between items-center">
                          <span className="text-xs text-warning">
                            {getRiskLevelLabel(item.riskLevel)}
                          </span>
                          <span 
                            className="text-xs font-semibold px-2 py-0.5 rounded"
                            style={{ 
                              color: getRiskLevelColor(item.riskLevel),
                              backgroundColor: `${getRiskLevelColor(item.riskLevel)}20`
                            }}
                          >
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {dashboardData.role === 'admin' && (
              <>
                <div className="p-5 bg-info-subtle border border-info-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-info mb-2">
                    AUM Global
                  </h3>
                  <div className="text-2xl font-bold text-info">
                    {formatCurrency(dashboardData.kpis.globalAum || 0)}
                  </div>
                </div>

                <div className="p-5 bg-success-subtle border border-success-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-success mb-2">
                    Carteras Activas
                  </h3>
                  <div className="text-2xl font-bold text-success">
                    {dashboardData.kpis.activeTemplates || 0}
                  </div>
                </div>

                <div className="p-5 bg-error-subtle border border-error-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-error mb-2">
                    Sin Cartera
                  </h3>
                  <div className="text-2xl font-bold text-error">
                    {dashboardData.kpis.clientsWithoutPortfolio || 0}
                  </div>
                </div>

                <div className="p-5 bg-error-subtle border border-error-subtle rounded-xl text-center">
                  <h3 className="text-sm font-semibold text-error mb-2">
                    Sin Precio Actualizado
                  </h3>
                  <div className="text-2xl font-bold text-error">
                    {dashboardData.kpis.instrumentsWithoutPrice || 0}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Gráfico de tendencia AUM (solo para advisors) */}
          {dashboardData.role === 'advisor' && dashboardData.aumTrend && dashboardData.aumTrend.length > 0 && (
            <div className="p-5 bg-surface border border-border rounded-xl shadow-sm">
              <h3 className="text-base font-semibold mb-4">
                Tendencia AUM - Últimos 30 días
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.aumTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                      fontSize={12}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'AUM']}
                      labelFormatter={(label) => `Fecha: ${formatDate(label)}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="var(--color-chart-1)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--color-chart-1)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'var(--color-chart-1)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top clientes (solo para managers) */}
          {dashboardData.role === 'manager' && dashboardData.topClients && dashboardData.topClients.length > 0 && (
            <div className="p-5 bg-surface border border-border rounded-xl shadow-sm">
              <h3 className="text-base font-semibold mb-4">
                Top 5 Clientes por AUM
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="p-3 text-left font-semibold">Cliente</th>
                      <th className="p-3 text-right font-semibold">AUM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topClients.map((client, index) => (
                      <tr key={client.contactId} className="border-b border-border">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-surface-hover text-text min-w-[24px] text-center">
                              #{index + 1}
                            </span>
                            <Link 
                              href={`/contacts/${client.contactId}`}
                              className="text-info no-underline font-medium"
                            >
                              {client.contactName}
                            </Link>
                          </div>
                        </td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(client.aum)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navegación a otras secciones */}
          <div className="p-5 bg-surface border border-border rounded-xl">
            <h3 className="text-base font-semibold mb-4">
              Más Analytics
            </h3>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/analytics/performance"
                className="px-4 py-2 bg-info text-white rounded-md no-underline text-sm font-medium"
              >
                📈 Performance & Riesgo
              </Link>
              <Link
                href="/analytics/benchmark-comparison"
                className="px-4 py-2 bg-purple-600 text-white rounded-md no-underline text-sm font-medium"
              >
                🎯 Comparación Benchmarks
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/benchmarks"
                  className="px-4 py-2 bg-warning text-white rounded-md no-underline text-sm font-medium"
                >
                  📊 Gestionar Benchmarks
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}