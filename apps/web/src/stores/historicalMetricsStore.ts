import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { HistoricalMetricsService } from '../services/historicalMetricsService';
import {
  HistoricalMetricsEnhanced,
  ChartDataPoint,
  MetricAlert,
  HistoricalDataModalState,
  MetricTrend,
  DataRetentionConfig,
  HistoricalMetricsRequest,
  HistoricalMetricsStore as HistoricalMetricsStoreInterface
} from '../types/historicalMetrics';

interface HistoricalMetricsStoreState {
  // State matching the interface
  metrics: HistoricalMetricsEnhanced[];
  trends: MetricTrend[];
  retentionConfig?: DataRetentionConfig;
  alerts: MetricAlert[];
  loading: boolean;
  error?: string;
  
  // Additional state for UI
  selectedMetric: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  viewMode: 'day' | 'month';
  currentDate: Date;
  chartData: ChartDataPoint[];
  modal: {
    isOpen: boolean;
    metricKey: string;
    title: string;
  };
}

interface HistoricalMetricsStore extends HistoricalMetricsStoreState, HistoricalMetricsStoreInterface {
  // Additional UI actions
  setSelectedMetric: (metric: string) => void;
  setTimeRange: (range: { start: Date; end: Date }) => void;
  setViewMode: (mode: 'day' | 'month') => void;
  setModalOpen: (open: boolean) => void;
  openModal: (metricKey: string, title: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Data fetching actions
  fetchHistoricalData: (metricKey: string, startDate: string, endDate: string) => Promise<void>;
  fetchTrends: (metricKey: string, days?: number) => Promise<void>;
  fetchAlerts: (metricKey: string) => Promise<void>;
  
  // Navigation actions
  navigateToNextPeriod: () => void;
  navigateToPreviousPeriod: () => void;
  resetToCurrentPeriod: () => void;
  
  // Data manipulation actions
  exportData: (metricKey: string, startDate: string, endDate: string) => Promise<any>;
  
  // Utility actions
  clearData: () => void;
  refreshData: () => Promise<void>;
}

const historicalMetricsService = new HistoricalMetricsService();

// Helper function to get date range based on view mode
const getDateRange = (viewMode: 'day' | 'month', currentDate: Date) => {
  const start = new Date(currentDate);
  const end = new Date(currentDate);
  
  if (viewMode === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }
  
  return { start, end };
};

// Helper function to navigate dates
const navigateDate = (currentDate: Date, direction: 'next' | 'previous', viewMode: 'day' | 'month') => {
  const newDate = new Date(currentDate);
  
  if (viewMode === 'day') {
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
  } else {
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
  }
  
  return newDate;
};

export const useHistoricalMetricsStore = create<HistoricalMetricsStore>()
  (devtools(
    (set, get) => ({
      // Initial state matching interface
      metrics: [],
      trends: [],
      retentionConfig: undefined,
      alerts: [],
      loading: false,
      error: undefined,
      
      // Additional UI state
      selectedMetric: '',
      timeRange: {
        start: new Date(),
        end: new Date()
      },
      viewMode: 'day',
      currentDate: new Date(),
      chartData: [],
      modal: {
        isOpen: false,
        metricKey: '',
        title: ''
      },
      
      // Basic setters
      setSelectedMetric: (metric: string) => {
        set({ selectedMetric: metric });
      },
      
      setTimeRange: (range: { start: Date; end: Date }) => {
        set({ timeRange: range });
      },
      
      setViewMode: (mode: 'day' | 'month') => {
        const state = get();
        const newRange = getDateRange(mode, state.currentDate);
        set({ 
          viewMode: mode,
          timeRange: newRange
        });
      },
      
      setModalOpen: (open: boolean) => {
        set((state) => ({
          modal: {
            ...state.modal,
            isOpen: open
          }
        }));
      },
      
      openModal: (metricKey: string, title: string) => {
        set({
          modal: {
            isOpen: true,
            metricKey,
            title
          }
        });
      },
      
      setLoading: (loading: boolean) => {
        set({ loading });
      },
      
      setError: (error: string | null) => {
        set({ error });
      },
      
      // Actions matching the interface
      fetchHistoricalMetrics: async (request: HistoricalMetricsRequest) => {
        try {
          set({ loading: true, error: undefined });
          
          // Mock implementation for now
          const mockMetrics: HistoricalMetricsEnhanced[] = [];
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate);
          
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            mockMetrics.push({
              id: `mock-${d.getTime()}`,
              date: d.toISOString().split('T')[0],
              granularity: request.granularity,
              total_contacts: Math.floor(Math.random() * 100) + 50,
              new_contacts: Math.floor(Math.random() * 20) + 5,
              active_contacts: Math.floor(Math.random() * 80) + 30,
              pipeline_contacts: Math.floor(Math.random() * 40) + 10,
              converted_contacts: Math.floor(Math.random() * 15) + 2,
              conversion_rate: Math.random() * 0.3 + 0.1,
              average_conversion_time: Math.floor(Math.random() * 30) + 5,
              pipeline_value: Math.floor(Math.random() * 50000) + 10000,
              closed_value: Math.floor(Math.random() * 30000) + 5000,
              average_deal_size: Math.floor(Math.random() * 5000) + 1000,
              total_value: Math.floor(Math.random() * 80000) + 15000,
              calculated_at: new Date().toISOString(),
              data_quality_score: Math.random() * 30 + 70,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
          
          set({ 
            metrics: mockMetrics,
            loading: false
          });
        } catch (error) {
          console.error('Error fetching historical metrics:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error fetching metrics',
            loading: false
          });
        }
      },
      
      calculateTrends: async (metricName: string, period: number): Promise<MetricTrend> => {
        try {
          set({ loading: true });
          
          // Mock trend calculation
          const mockTrend: MetricTrend = {
            metric_name: metricName,
            current_value: Math.floor(Math.random() * 1000) + 100,
            previous_value: Math.floor(Math.random() * 1000) + 100,
            change_percentage: Math.random() * 20 - 10,
            trend_direction: Math.random() > 0.5 ? 'up' : 'down',
            data_points: Array.from({ length: period }, (_, i) => ({
              date: new Date(Date.now() - (period - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              value: Math.floor(Math.random() * 100) + 50
            }))
          };
          
          const state = get();
          set({ 
            trends: [...state.trends, mockTrend],
            loading: false
          });
          
          return mockTrend;
        } catch (error) {
          console.error('Error calculating trends:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error calculating trends',
            loading: false
          });
          throw error;
        }
      },
      
      updateRetentionConfig: async (config: Partial<DataRetentionConfig>) => {
        try {
          set({ loading: true });
          
          // Mock retention config update
          const updatedConfig: DataRetentionConfig = {
            id: config.id || `config-${Date.now()}`,
            user_id: config.user_id || 'current-user',
            daily_retention_days: config.daily_retention_days || 30,
            monthly_retention_months: config.monthly_retention_months || 12,
            auto_archive_enabled: config.auto_archive_enabled ?? true,
            created_at: config.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          set({ 
            retentionConfig: updatedConfig,
            loading: false
          });
        } catch (error) {
          console.error('Error updating retention config:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error updating retention config',
            loading: false
          });
        }
      },
      
      createAlert: async (alertData: Omit<MetricAlert, 'id' | 'created_at' | 'updated_at'>) => {
        try {
          set({ loading: true });
          
          const newAlert: MetricAlert = {
            ...alertData,
            id: `alert-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const state = get();
          set({ 
            alerts: [...state.alerts, newAlert],
            loading: false
          });
        } catch (error) {
          console.error('Error creating alert:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error creating alert',
            loading: false
          });
        }
      },
      
      updateAlert: async (id: string, updates: Partial<MetricAlert>) => {
        try {
          set({ loading: true });
          
          const state = get();
          const updatedAlerts = state.alerts.map(alert => 
            alert.id === id 
              ? { ...alert, ...updates, updated_at: new Date().toISOString() }
              : alert
          );
          
          set({ 
            alerts: updatedAlerts,
            loading: false
          });
        } catch (error) {
          console.error('Error updating alert:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error updating alert',
            loading: false
          });
        }
      },
      
      deleteAlert: async (id: string) => {
        try {
          set({ loading: true });
          
          const state = get();
          const filteredAlerts = state.alerts.filter(alert => alert.id !== id);
          
          set({ 
            alerts: filteredAlerts,
            loading: false
          });
        } catch (error) {
          console.error('Error deleting alert:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error deleting alert',
            loading: false
          });
        }
      },
      
      clearError: () => {
        set({ error: undefined });
      },
      
      // Navigation actions
      navigateToNextPeriod: () => {
        const state = get();
        const newDate = navigateDate(state.currentDate, 'next', state.viewMode);
        const newRange = getDateRange(state.viewMode, newDate);
        
        set({ 
          currentDate: newDate,
          timeRange: newRange
        });
        
        // Refresh data if we have a selected metric
        if (state.selectedMetric) {
          get().fetchHistoricalMetrics({
            startDate: newRange.start.toISOString(),
            endDate: newRange.end.toISOString(),
            granularity: state.viewMode === 'day' ? 'daily' : 'monthly'
          });
        }
      },
      
      navigateToPreviousPeriod: () => {
        const state = get();
        const newDate = navigateDate(state.currentDate, 'previous', state.viewMode);
        const newRange = getDateRange(state.viewMode, newDate);
        
        set({ 
          currentDate: newDate,
          timeRange: newRange
        });
        
        // Refresh data if we have a selected metric
        if (state.selectedMetric) {
          get().fetchHistoricalMetrics({
            startDate: newRange.start.toISOString(),
            endDate: newRange.end.toISOString(),
            granularity: state.viewMode === 'day' ? 'daily' : 'monthly'
          });
        }
      },
      
      resetToCurrentPeriod: () => {
        const state = get();
        const currentDate = new Date();
        const newRange = getDateRange(state.viewMode, currentDate);
        
        set({ 
          currentDate,
          timeRange: newRange
        });
        
        // Refresh data if we have a selected metric
        if (state.selectedMetric) {
          get().fetchHistoricalMetrics({
            startDate: newRange.start.toISOString(),
            endDate: newRange.end.toISOString(),
            granularity: state.viewMode === 'day' ? 'daily' : 'monthly'
          });
        }
      },
      
      // Data manipulation actions
      exportData: async (metricKey: string, startDate: string, endDate: string) => {
        try {
          set({ loading: true });
          const exportData = await historicalMetricsService.exportHistoricalData(
            metricKey,
            startDate,
            endDate
          );
          set({ loading: false });
          return exportData;
        } catch (error) {
          console.error('Error exporting data:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Error exporting data',
            loading: false
          });
          throw error;
        }
      },
      
      // Utility actions
      clearData: () => {
        set({
          metrics: [],
          chartData: [],
          trends: [],
          selectedMetric: '',
          error: undefined
        });
      },
      
      refreshData: async () => {
        const state = get();
        const store = get();
        if (state.selectedMetric && state.timeRange.start && state.timeRange.end) {
          await store.fetchHistoricalMetrics({
            startDate: state.timeRange.start.toISOString(),
            endDate: state.timeRange.end.toISOString(),
            granularity: state.viewMode === 'day' ? 'daily' : 'monthly'
          });
        }
      }
    }),
    {
      name: 'historical-metrics-store',
      partialize: (state) => ({
        viewMode: state.viewMode,
        currentDate: state.currentDate
      })
    }
  ));

// Selector hooks for easier component usage
export const useHistoricalMetrics = () => useHistoricalMetricsStore(state => state.metrics);
export const useChartData = () => useHistoricalMetricsStore(state => state.chartData);
export const useTrends = () => useHistoricalMetricsStore(state => state.trends);
export const useRetentionConfig = () => useHistoricalMetricsStore(state => state.retentionConfig);
export const useAlerts = () => useHistoricalMetricsStore(state => state.alerts);
export const useHistoricalLoading = () => useHistoricalMetricsStore(state => state.loading);
export const useHistoricalError = () => useHistoricalMetricsStore(state => state.error);
export const useSelectedMetric = () => useHistoricalMetricsStore(state => state.selectedMetric);
export const useTimeRange = () => useHistoricalMetricsStore(state => state.timeRange);
export const useViewMode = () => useHistoricalMetricsStore(state => state.viewMode);
export const useCurrentDate = () => useHistoricalMetricsStore(state => state.currentDate);
export const useModalState = () => useHistoricalMetricsStore(state => state.modal);