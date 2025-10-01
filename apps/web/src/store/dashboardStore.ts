import React from 'react';
import { create } from 'zustand';
import { 
  DashboardState, 
  ChartDataPoint, 
  ChartType, 
  TimeFrame,
  Notification,
  ContactStatus,
  CHART_COLORS,
  STATUS_COLORS
} from '../types/metrics';
import { useCRMStore } from './crmStore';
import { useMetricsStore } from './metricsStore';

// Función para generar IDs únicos
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};



// Función para obtener datos de tendencia de conversión
const getConversionTrendData = (timeframe: TimeFrame): ChartDataPoint[] => {
  const { historicalMetrics } = useMetricsStore.getState();
  
  if (historicalMetrics.length === 0) {
    // Datos mock para desarrollo
    const periods = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 12;
    return Array.from({ length: Math.min(periods, 10) }, (_, index) => ({
      label: `Período ${index + 1}`,
      value: Math.floor(Math.random() * 30) + 10,
      color: CHART_COLORS.secondary
    }));
  }
  
  return historicalMetrics
    .filter(m => m.timeframe === timeframe)
    .slice(-10)
    .map((metric, index) => ({
      label: `P${index + 1}`,
      value: metric.conversionRate,
      color: CHART_COLORS.secondary,
      metadata: {
        date: metric.calculatedAt,
        totalContacts: metric.totalContacts,
        conversions: metric.conversionsThisMonth
      }
    }));
};

// Función para obtener datos de distribución del pipeline
const getPipelineDistributionData = (): ChartDataPoint[] => {
  const contacts = useCRMStore.getState().contacts;
  const statusCounts: Record<ContactStatus, number> = {
    'Prospecto': 0,
    'Contactado': 0,
    'Primera Reunion': 0,
    'Segunda Reunion': 0,
    'Apertura': 0,
    'Cliente': 0,
    'Caido': 0,
    'Cuenta Vacia': 0
  };
  
  contacts.forEach(contact => {
    statusCounts[contact.status]++;
  });
  
  return Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      label: status,
      value: count,
      color: STATUS_COLORS[status as ContactStatus]
    }));
};

// Función para obtener datos de actividad reciente
const getRecentActivityData = (): ChartDataPoint[] => {
  const contacts = useCRMStore.getState().contacts;
  const { conversions } = useMetricsStore.getState();
  
  // Combinar contactos recientes y conversiones
  const recentContacts = contacts
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  const recentConversions = conversions
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3);
  
  return [
    {
      label: 'Contactos Actualizados',
      value: recentContacts.length,
      color: CHART_COLORS.info
    },
    {
      label: 'Conversiones Recientes',
      value: recentConversions.length,
      color: CHART_COLORS.success
    }
  ];
};

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  metrics: {
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    conversionRate: 0,
    averageResponseTime: 0,
    customerSatisfaction: 0,
    totalContacts: 0,
    totalDeals: 0,
    pipelineValue: 0,
    winRate: 0,
    averageDealSize: 0,
    salesCycleLength: 0,
    topPerformers: [],
    recentActivities: []
  },
  isLoading: false,
  selectedTimeRange: 'month' as TimeFrame,
  chartData: {},
  notifications: [],
  refreshInterval: 30000, // 30 segundos por defecto
  lastUpdated: new Date(),
  isRefreshing: false,
  
  refreshDashboard: async () => {
    set({ isRefreshing: true });
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        // Actualizar todos los tipos de gráficos con fallback local
        const chartData = {
          'conversion-trend-week': getConversionTrendData('week'),
          'conversion-trend-month': getConversionTrendData('month'),
          'pipeline-distribution': getPipelineDistributionData(),
          'recent-activity': getRecentActivityData()
        };
        
        set({ 
          chartData,
          lastUpdated: new Date(),
          isRefreshing: false
        });
        
        // Intentar actualizar métricas con fallback
        try {
          await useMetricsStore.getState().refreshMetrics();
        } catch (metricsError) {
          console.warn('Error actualizando métricas, usando datos locales:', metricsError);
          // Las métricas fallarán graciosamente con datos locales
        }
        
        // Éxito - salir del bucle
        return;
        
      } catch (error) {
        attempt++;
        console.error(`Error refreshing dashboard (intento ${attempt}/${maxRetries}):`, error);
        
        if (attempt >= maxRetries) {
          // Fallback final: usar solo datos locales
          try {
            const fallbackChartData = {
              'conversion-trend-week': getConversionTrendData('week'),
              'conversion-trend-month': getConversionTrendData('month'),
              'pipeline-distribution': getPipelineDistributionData(),
              'recent-activity': getRecentActivityData()
            };
            
            set({ 
              chartData: fallbackChartData,
              lastUpdated: new Date(),
              isRefreshing: false
            });
            
            get().addNotification({
              type: 'warning',
              title: 'Modo Offline',
              message: 'Dashboard actualizado con datos locales. Algunas métricas pueden estar desactualizadas.',
              user_id: 'current-user',
              priority: 'medium',
              created_at: new Date().toISOString()
            });
            
          } catch (fallbackError) {
            console.error('Error en fallback del dashboard:', fallbackError);
            set({ isRefreshing: false });
            
            get().addNotification({
              type: 'error',
              title: 'Error Crítico',
              message: 'No se pudo actualizar el dashboard. Recarga la página.',
              user_id: 'current-user',
              priority: 'high',
              created_at: new Date().toISOString()
            });
          }
        } else {
          // Esperar antes del siguiente intento (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  },
  
  getChartData: (chartType, timeframe) => {
    const { chartData } = get();
    const key = timeframe ? `${chartType}-${timeframe}` : chartType;
    
    if (chartData[key]) {
      return chartData[key];
    }
    
    // Generar datos si no existen
    switch (chartType) {
      case 'conversion-trend':
        return getConversionTrendData(timeframe);
      case 'pipeline-distribution':
        return getPipelineDistributionData();
      default:
        return [];
    }
  },
  
  addNotification: (notificationData) => {
    const notification: Notification = {
      ...notificationData,
      id: generateId(),
      timestamp: new Date().toISOString(),
      read: false
    };
    
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 50) // Mantener últimas 50
    }));
    
    // Auto-remover notificaciones después de 5 segundos para tipos success e info
    if (notification.type === 'success' || notification.type === 'info') {
      setTimeout(() => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== notification.id)
        }));
      }, 5000);
    }
  },
  
  clearNotifications: () => {
    set({ notifications: [] });
  },
  
  markNotificationAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(notification =>
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    }));
  },
  
  setRefreshInterval: (interval) => {
    set({ refreshInterval: interval });
  }
}));

// Hook para auto-refresh del dashboard
export const useAutoRefresh = () => {
  const { refreshInterval, refreshDashboard } = useDashboardStore();
  
  React.useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        refreshDashboard();
      }, refreshInterval);
      
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, refreshDashboard]);
};

// Hook para obtener notificaciones no leídas
export const useUnreadNotifications = () => {
  const notifications = useDashboardStore(state => state.notifications);
  return notifications.filter(n => !n.read);
};

// Hook para obtener estadísticas del dashboard
export const useDashboardStats = () => {
  const { chartData, lastUpdated, isRefreshing } = useDashboardStore();
  const contacts = useCRMStore(state => state.contacts);
  const { currentMetrics } = useMetricsStore();
  
  return {
    totalCharts: Object.keys(chartData).length,
    totalContacts: contacts.length,
    lastUpdated,
    isRefreshing,
    hasMetrics: !!currentMetrics,
    conversionRate: currentMetrics?.conversionRate || 0,
    activeProspects: currentMetrics?.activeProspects || 0
  };
};