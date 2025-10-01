import React, { useEffect, useState } from 'react';
import { Users, TrendingUp, Phone, Target, Clock, CheckCircle, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useMetricsStore } from '../store/metricsStore';
import { useCRMStore } from '../store/crmStore';
import { MetricsService } from '../services/metricsService';
import MetricCard from './MetricCard';
import { AnimatedCounter } from './AnimatedCounter';
import HistoricalDataModal from './HistoricalDataModal';
import { useHistoricalMetricsStore } from '../stores/historicalMetricsStore';
import { cn } from '../lib/utils';
// import { LayoutConfig } from '../config/layout-config'; // Migrated to Cactus Dashboard palette

interface LiveMetricsPanelProps {
  className?: string;
  refreshInterval?: number;
}

export const LiveMetricsPanel: React.FC<LiveMetricsPanelProps> = ({
  className,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { user } = useAuthStore();
  const { contacts } = useCRMStore();
  const {
    currentMetrics,
    isCalculating,
    calculateMetrics,
    refreshMetrics,
    getPerformanceIndicators
  } = useMetricsStore();
  
  const [previousMetrics, setPreviousMetrics] = useState(currentMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [realMetrics, setRealMetrics] = useState<any>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    metricType: string;
    metricTitle: string;
  }>({ isOpen: false, metricType: '', metricTitle: '' });
  
  const metricsService = new MetricsService();
  const { openModal } = useHistoricalMetricsStore();
  
  // Debug: Monitor modalState changes
  useEffect(() => {
    console.log('🔍 LiveMetricsPanel modalState changed:', modalState);
  }, [modalState]);

  // Load real metrics on component mount
  useEffect(() => {
    const loadRealMetrics = async () => {
      try {
        // Cargar métricas históricas primero
        // Historical metrics are already available in the store
        
        const metrics = await metricsService.getCurrentMonthMetrics(user?.id);
        setRealMetrics(metrics);
        
        // Luego calcular métricas actuales
        if (user?.id) {
          await calculateMetrics(user.id, 'month');
        }
      } catch (error) {
        console.error('Error loading real metrics:', error);
      }
    };
    
    loadRealMetrics();
  }, [calculateMetrics, user?.id]);

  // Auto-refresh metrics
  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      setPreviousMetrics(currentMetrics);
      
      // Load real metrics
      try {
        const metrics = await metricsService.getCurrentMonthMetrics(user?.id);
        setRealMetrics(metrics);
      } catch (error) {
        console.error('Error refreshing real metrics:', error);
      }
      
      if (user?.id) {
        await calculateMetrics(user.id, 'month');
      }
      setTimeout(() => setIsRefreshing(false), 1000);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [calculateMetrics, currentMetrics, user?.id]);

  // Get user-specific contacts first (consistent filtering by user.id)
  const userContacts = user?.role === 'advisor' 
    ? contacts.filter(c => c.assignedTo === user.id)
    : contacts;
  
  // Calculate derived metrics using user-filtered data
  const totalContacts = realMetrics?.total_contacts || userContacts.length;
  // Clientes activos son solo los contactos que están en estado "Cliente" del usuario actual
  const activeContacts = userContacts.filter(c => c.status === 'Cliente').length;
  const pipelineContacts = userContacts.filter(c => c.status !== 'Cliente' && c.status !== 'Cuenta Vacia').length;
  // Tasa de conversión: cuántos contactos del usuario se convirtieron a clientes
  const conversionRate = totalContacts > 0 ? (activeContacts / totalContacts) * 100 : 0;
  const conversionsThisMonth = realMetrics?.converted_to_client || currentMetrics?.conversionsThisMonth || 0;
  const teamMetrics = realMetrics || currentMetrics;
  
  // Additional user-specific metrics for reference
  const userConversions = userContacts.filter(c => c.status === 'Cliente').length;
  const userProspects = userContacts.filter(c => c.status === 'Prospecto').length;
  // Usar 'Contactado' en lugar de 'Calificado' que no existe en ContactStatus
  const userQualified = userContacts.filter(c => c.status === 'Contactado').length;

  // Calculate trends
  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return 'neutral';
    return current > previous ? 'up' : current < previous ? 'down' : 'neutral';
  };

  const getTrendValue = (current: number, previous: number) => {
    if (previous === 0) return 'Nuevo';
    const change = ((current - previous) / previous * 100).toFixed(1);
    return `${change}%`;
  };

  const getLastUpdatedText = () => {
    if (!currentMetrics?.calculatedAt) return 'Nunca';
    const now = new Date();
    const updated = new Date(currentMetrics.calculatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins === 1) return 'Hace 1 minuto';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Hace 1 hora';
    return `Hace ${diffHours} horas`;
  };

  const handleHistoricalClick = (metricType: string, metricTitle: string) => {
    console.log('🔍 Historical click received:', { metricType, metricTitle });
    console.log('🔍 Current modalState before update:', modalState);
    setModalState({ isOpen: true, metricType, metricTitle });
    console.log('🔍 Modal state set to:', { isOpen: true, metricType, metricTitle });
    openModal(metricType, metricTitle);
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, metricType: '', metricTitle: '' });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with refresh status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Métricas en Tiempo Real</h2>
        <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
          <div className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            isRefreshing || isCalculating ? "bg-cactus-500 animate-pulse" : "bg-green-500"
          )}></div>
          <span>Actualizado: {getLastUpdatedText()}</span>
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Contactos"
          value={<AnimatedCounter value={totalContacts} />}
          previousValue={previousMetrics?.totalContacts || 0}
          icon={<Users className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />}
          trend={getTrend(totalContacts, previousMetrics?.totalContacts || 0)}
          trendValue={getTrendValue(totalContacts, previousMetrics?.totalContacts || 0)}
          isLoading={isCalculating}
          hasHistoricalData={true}
          onHistoricalClick={() => handleHistoricalClick('total_contacts', 'Total Contactos')}
        />

        <MetricCard
          title="Clientes Activos"
          value={<AnimatedCounter value={activeContacts} />}
          previousValue={previousMetrics?.conversionsThisMonth || 0}
          icon={<TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />}
          trend={getTrend(activeContacts, previousMetrics?.conversionsThisMonth || 0)}
          trendValue={getTrendValue(activeContacts, previousMetrics?.conversionsThisMonth || 0)}
          isLoading={isCalculating}
          hasHistoricalData={true}
          onHistoricalClick={() => handleHistoricalClick('active_clients', 'Clientes Activos')}
        />

        <MetricCard
          title="Tasa de Conversión"
          value={<AnimatedCounter value={conversionRate} suffix="%" decimals={1} />}
          previousValue={previousMetrics?.conversionRate || 0}
          icon={<Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          trend={getTrend(conversionRate, previousMetrics?.conversionRate || 0)}
          trendValue={getTrendValue(conversionRate, previousMetrics?.conversionRate || 0)}
          isLoading={isCalculating}
          hasHistoricalData={true}
          onHistoricalClick={() => handleHistoricalClick('conversion_rate', 'Tasa de Conversión')}
        />

        <MetricCard
          title="Conversiones del Mes"
          value={<AnimatedCounter value={conversionsThisMonth} />}
          previousValue={previousMetrics?.conversionsThisMonth || 0}
          icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
          trend={getTrend(conversionsThisMonth, previousMetrics?.conversionsThisMonth || 0)}
          trendValue={getTrendValue(conversionsThisMonth, previousMetrics?.conversionsThisMonth || 0)}
          isLoading={isCalculating}
          hasHistoricalData={true}
          onHistoricalClick={() => handleHistoricalClick('monthly_conversions', 'Conversiones del Mes')}
        />

        <MetricCard
          title="Contactos en Pipeline"
          value={<AnimatedCounter value={pipelineContacts} />}
          previousValue={previousMetrics?.activeProspects || 0}
          icon={<UserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          trend={getTrend(pipelineContacts, previousMetrics?.activeProspects || 0)}
          trendValue={getTrendValue(pipelineContacts, previousMetrics?.activeProspects || 0)}
          isLoading={isCalculating}
          variant="accent"
          hasHistoricalData={true}
          onHistoricalClick={() => handleHistoricalClick('pipeline_contacts', 'Contactos en Pipeline')}
        />
      </div>



      {/* Team metrics (for managers) */}
      {user?.role === 'manager' && teamMetrics && (
        <div className="space-y-4">
          <h3 className="text-md font-medium text-neutral-900 dark:text-neutral-100">Métricas del Equipo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Asesores Activos"
              value={<AnimatedCounter value={teamMetrics?.activeProspects || 0} />}
              icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              isLoading={isCalculating}
              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
            />

            <MetricCard
              title="Llamadas del Equipo"
              value={<AnimatedCounter value={contacts.length} />}
              icon={<Phone className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />}
              isLoading={isCalculating}
              className="bg-cactus-50 dark:bg-cactus-900/20 border-cactus-200 dark:border-cactus-700"
            />

            <MetricCard
              title="Conversiones del Equipo"
              value={<AnimatedCounter value={teamMetrics?.conversionsThisMonth || 0} />}
              icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
              isLoading={isCalculating}
              className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
            />

            <MetricCard
              title="Promedio de Conversión"
              value={<AnimatedCounter value={teamMetrics?.conversionRate || 0} suffix="%" decimals={1} />}
              icon={<Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              isLoading={isCalculating}
              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
            />
          </div>
        </div>
      )}

      {/* Historical Data Modal */}
      <HistoricalDataModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        metricType={modalState.metricType}
        metricTitle={modalState.metricTitle}
      />
    </div>
  );
};

export default LiveMetricsPanel;