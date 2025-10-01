import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Download, RefreshCw, TrendingUp, TrendingDown, BarChart3, Activity, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subDays, subMonths, addDays, addMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { useHistoricalMetricsStore } from '../store/historicalMetricsStore';
import HistoricalMetricsService from '../services/historicalMetricsService';
import { cn } from '../lib/utils';
// import { LayoutConfig } from '../config/layoutConfig';
import type {
  HistoricalMetricsEnhanced,
  TimeNavigationState,
  ChartDataPoint,
  HistoricalDataModalProps
} from '../types/historicalMetrics';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HistoricalDataModalState {
  isOpen: boolean;
  metricKey: string;
  metricTitle: string;
  data: HistoricalMetricsEnhanced[];
  isLoading: boolean;
  error: string | null;
  timeNavigation: TimeNavigationState;
}

const HistoricalDataModal: React.FC<HistoricalDataModalProps> = ({
  isOpen,
  onClose,
  metricType,
  metricTitle,
  onExport,
  onRefresh
}) => {
  console.log('🔍 HistoricalDataModal props:', { isOpen, metricType, metricTitle });
  
  useEffect(() => {
    console.log('🔍 HistoricalDataModal isOpen changed:', isOpen);
    if (isOpen) {
      console.log('🔍 Modal should be visible now with:', { metricType, metricTitle });
    }
  }, [isOpen, metricType, metricTitle]);
  const {
    metrics,
    loading,
    error,
    viewMode,
    currentDate,
    timeRange,
    fetchHistoricalMetrics,
    setViewMode,
    navigateToNextPeriod,
    navigateToPreviousPeriod,
    resetToCurrentPeriod,
    clearError
  } = useHistoricalMetricsStore();
  
  const [historicalService] = useState(() => new HistoricalMetricsService());
  const [data, setData] = useState<HistoricalMetricsEnhanced[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [timeNavigation, setTimeNavigation] = useState<TimeNavigationState>({
    currentPeriod: new Date().toISOString(),
    granularity: 'daily',
    startDate: subDays(new Date(), 30).toISOString(),
    endDate: new Date().toISOString()
  });

  // Efecto para cargar datos reales cuando se abre el modal o cambian los parámetros
  useEffect(() => {
    if (!isOpen) return;
    
    const loadRealData = async () => {
      try {
        clearError();
        
        await fetchHistoricalMetrics({
          startDate: timeRange.start.toISOString(),
          endDate: timeRange.end.toISOString(),
          granularity: viewMode === 'day' ? 'daily' : 'monthly'
        });
      } catch (err) {
        console.error('Error loading historical data:', err);
      }
    };
    
    loadRealData();
  }, [isOpen, timeRange, viewMode, fetchHistoricalMetrics, clearError]);
  
  // Efecto para limpiar errores cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      clearError();
    }
  }, [isOpen, clearError]);

  // Calculate date range based on current period and granularity
  const { startDate, endDate } = useMemo(() => {
    const currentDate = new Date(timeNavigation.currentPeriod);
    let startDate: Date;
    let endDate: Date;

    if (timeNavigation.granularity === 'daily') {
      // Last 30 days from current period
      startDate = subDays(currentDate, 29);
      endDate = currentDate;
    } else {
      // Last 12 months from current period
      startDate = subMonths(currentDate, 11);
      endDate = currentDate;
    }

    return { startDate, endDate };
  }, [timeNavigation.currentPeriod, timeNavigation.granularity]);

  // Filter and process data for chart
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    });
  }, [data, startDate, endDate]);

  // Procesar datos reales para el gráfico con diseño mejorado
  const chartData = useMemo(() => {
    if (!metrics.length) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    const labels = metrics.map(item => {
      const date = new Date(item.created_at);
      return viewMode === 'day' 
        ? format(date, 'dd MMM', { locale: es })
        : format(date, 'MMM yyyy', { locale: es });
    });
    
    const values = metrics.map(item => item.total_contacts);
    
    // Gradiente moderno para el gráfico
    const gradient = {
      borderColor: 'rgb(59, 130, 246)', // Blue-500
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      pointBackgroundColor: 'rgb(59, 130, 246)',
      pointBorderColor: 'white',
    };
    
    return {
      labels,
      datasets: [
        {
          label: metricTitle,
          data: values,
          borderColor: gradient.borderColor,
          backgroundColor: gradient.backgroundColor,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: gradient.pointBackgroundColor,
          pointBorderColor: gradient.pointBorderColor,
          pointBorderWidth: 3,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: 'rgb(37, 99, 235)', // Blue-600
          pointHoverBorderColor: 'white',
          pointHoverBorderWidth: 3,
        }
      ]
    };
  }, [metrics, metricTitle, viewMode]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(34, 197, 94, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const index = context[0].dataIndex;
            const item = filteredData[index];
            return item ? format(new Date(item.date), 'PPP', { locale: es }) : '';
          },
          label: (context: any) => {
            return `${metricTitle}: ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: 'rgba(0, 0, 0, 0.6)',
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: 'rgba(0, 0, 0, 0.6)',
          font: {
            size: 12
          },
          callback: (value: any) => value.toLocaleString()
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  const handleViewTypeChange = (newViewType: 'day' | 'month') => {
    setViewMode(newViewType);
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      navigateToNextPeriod();
    } else {
      navigateToPreviousPeriod();
    }
  };

  const handleExport = async () => {
    if (!metrics.length) return;
    
    try {
      const exportData = await historicalService.exportHistoricalData(
        metricType,
        timeRange.start.toISOString().split('T')[0],
        timeRange.end.toISOString().split('T')[0]
      );
      
      const csvContent = [
        ['Fecha', 'Valor', 'Tasa de Conversión', 'Puntuación de Calidad'].join(','),
        ...metrics.map(item => [
          format(new Date(item.created_at), 'yyyy-MM-dd'),
          item.total_contacts,
          (item.conversion_rate * 100).toFixed(2) + '%',
          (item.data_quality_score * 100).toFixed(1) + '%'
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metricType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchHistoricalMetrics({
      startDate: timeRange.start.toISOString(),
      endDate: timeRange.end.toISOString(),
      granularity: viewMode === 'day' ? 'daily' : 'monthly'
    });
  };
  
  const handleResetToCurrentPeriod = () => {
    resetToCurrentPeriod();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
        {/* Header con gradiente moderno */}
        <div className="relative bg-gradient-to-r from-cactus-600 via-cactus-700 to-cactus-800 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-cactus-600/90 to-cactus-700/90"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  Datos Históricos: {metricTitle}
                </h2>
                <p className="text-cactus-100 text-sm font-medium">
                  {format(startDate, 'dd MMM yyyy', { locale: es })} - {format(endDate, 'dd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          
            <div className="flex items-center space-x-3">
              {onRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-200 group",
                    "hover:bg-white/20 text-white",
                    isLoading && "animate-spin"
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              
              {onExport && chartData && (
                <button
                  onClick={handleExport}
                  className="p-2.5 rounded-xl transition-all duration-200 hover:bg-white/20 text-white group"
                >
                  <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 group"
              >
                <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>

        {/* Controls con diseño mejorado */}
        <div className="bg-gradient-to-r from-neutral-50 to-cactus-50/30 p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            {/* View Type Toggle con estilo moderno */}
            <div className="flex items-center space-x-1 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
              <button
                onClick={() => handleViewTypeChange('day')}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                  viewMode === 'day'
                    ? 'bg-cactus-600 text-white shadow-md transform scale-105'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400 hover:bg-cactus-50 dark:hover:bg-cactus-900/20'
                )}
              >
                📅 Diario
              </button>
              <button
                onClick={() => handleViewTypeChange('month')}
                className={cn(
                  "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                  viewMode === 'month'
                    ? 'bg-cactus-600 text-white shadow-md transform scale-105'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400 hover:bg-cactus-50 dark:hover:bg-cactus-900/20'
                )}
              >
                📊 Mensual
              </button>
            </div>

            {/* Date Navigation con estilo premium */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleDateNavigation('prev')}
                className="p-3 rounded-xl transition-all duration-200 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-md text-neutral-600 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400 border border-neutral-200 dark:border-neutral-700 hover:border-cactus-500 group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div className="flex items-center space-x-3 px-5 py-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                <Calendar className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {viewMode === 'day' ? '📈 Últimos 30 días' : '📊 Últimos 12 meses'}
                </span>
              </div>
              
              <button
                onClick={() => handleDateNavigation('next')}
                disabled={currentDate >= new Date()}
                className={cn(
                  "p-3 rounded-xl transition-all duration-200 border group",
                  currentDate >= new Date()
                    ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800'
                    : 'hover:bg-white dark:hover:bg-neutral-800 hover:shadow-md text-neutral-600 dark:text-neutral-400 hover:text-cactus-600 dark:hover:text-cactus-400 border-neutral-200 dark:border-neutral-700 hover:border-cactus-500'
                )}
              >
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform",
                  currentDate < new Date() && "group-hover:translate-x-0.5"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Content con diseño premium */}
        <div className="p-8 bg-gradient-to-br from-white to-neutral-50/50 dark:from-neutral-900 dark:to-neutral-800/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-80">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-cactus-200 dark:border-cactus-800"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-cactus-500 border-t-transparent absolute top-0 left-0"></div>
              </div>
              <p className="mt-4 text-neutral-600 dark:text-neutral-400 font-medium">Cargando datos históricos...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-80">
              <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
                <p className="text-red-800 dark:text-red-200 font-semibold mb-2">Error al cargar los datos</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : !chartData || chartData.labels.length === 0 ? (
            <div className="flex items-center justify-center h-80">
              <div className="text-center p-8 bg-neutral-100 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <BarChart3 className="w-16 h-16 text-neutral-400 dark:text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-900 dark:text-neutral-100 font-semibold mb-2">No hay datos disponibles</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No se encontraron datos para el período seleccionado</p>
              </div>
            </div>
          ) : (
            <div className="h-80 bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700">
              <Line data={chartData} options={chartOptions} />
            </div>
          )}
        </div>

        {/* Footer Stats con diseño premium */}
        {chartData && chartData.labels.length > 0 && (
          <div className="px-8 py-6 bg-gradient-to-r from-cactus-50 via-cactus-100/50 to-cactus-50 dark:from-cactus-900/20 dark:via-cactus-800/20 dark:to-cactus-900/20 border-t border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 bg-cactus-50 dark:bg-cactus-900/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">📊 Promedio</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {(chartData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) / chartData.datasets[0].data.length).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">🚀 Máximo</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.max(...chartData.datasets[0].data as number[]).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-center mb-2">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">📉 Mínimo</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {Math.min(...chartData.datasets[0].data as number[]).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalDataModal;
export type { HistoricalDataModalState };