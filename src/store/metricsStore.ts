import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  MetricsState, 
  MetricsSnapshot, 
  ConversionEvent, 
  ContactStatus, 
  TimeFrame,
  ChartDataPoint,
  PerformanceIndicators,
  PipelineData,
  CONVERSION_PATHS,
  Contact
} from '../types/metrics';
import { useCRMStore } from './crmStore';
import { useTeamStore } from './teamStore';
import { executeWithRetry, withErrorHandling } from '../utils/supabaseErrorHandler';
import { EnhancedMetricsService } from '../services/enhancedMetricsService';

// Enhanced interfaces for team-level metrics
export interface TeamMetrics {
  teamId: string;
  teamName: string;
  totalContacts: number;
  totalConversions: number;
  averageConversionRate: number;
  topPerformer: {
    userId: string;
    name: string;
    conversionRate: number;
  };
  memberMetrics: AdvisorMetrics[];
  calculatedAt: Date;
}

export interface AdvisorMetrics {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalContacts: number;
  conversionsThisMonth: number;
  conversionRate: number;
  averageTimeToConvert: number;
  pipelineDistribution: PipelineData[];
  weeklyGrowth: number;
  monthlyGrowth: number;
  rank: number;
  calculatedAt: Date;
}

// Enhanced MetricsState interface
export interface EnhancedMetricsState extends MetricsState {
  // Team-level metrics
  teamMetrics: TeamMetrics[];
  advisorMetrics: AdvisorMetrics[];
  isCalculatingTeamMetrics: boolean;
  
  // Core metrics properties
  currentMetrics: MetricsSnapshot | null;
  isCalculating: boolean;
  historicalMetrics: MetricsSnapshot[];
  conversions: ConversionEvent[];
  
  // Core methods
  calculateMetrics: (userId?: string, timeframe?: TimeFrame) => Promise<MetricsSnapshot>;
  refreshMetrics: () => Promise<void>;
  getPerformanceIndicators: (userId?: string) => PerformanceIndicators;
  recordConversion: (conversion: ConversionEvent) => Promise<void>;
  getConversionRate: (fromStatus: ContactStatus, toStatus: ContactStatus) => number;
  getTrendData: (timeframe: TimeFrame) => ChartDataPoint[];
  loadHistoricalMetrics: (days?: number) => Promise<MetricsSnapshot[]>;
  
  // Team-level methods
  calculateTeamMetrics: (teamId?: string) => Promise<TeamMetrics>;
  calculateAllAdvisorMetrics: () => Promise<AdvisorMetrics[]>;
  getTeamPerformanceComparison: (teamId: string) => AdvisorMetrics[];
  getTopPerformers: (limit?: number) => AdvisorMetrics[];
  refreshTeamMetrics: () => Promise<void>;
}
// Contact and ConversionEvent types are imported from metrics.ts above

// Función auxiliar para generar IDs únicos
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Función para calcular días entre fechas
const daysBetween = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Función para obtener el rango de fechas según el timeframe
const getDateRange = (timeframe: TimeFrame): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  
  switch (timeframe) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return { start, end: now };
};

// Función para calcular métricas
const calculateMetricsFromContacts = (
  contacts: any[], 
  conversions: ConversionEvent[], 
  userId?: string, 
  timeframe: TimeFrame = 'month'
): MetricsSnapshot => {
  const { start, end } = getDateRange(timeframe);
  
  // Filtrar contactos por usuario si se especifica
  const filteredContacts = userId 
    ? contacts.filter(c => c.assignedTo === userId)
    : contacts;
  
  // Filtrar conversiones por rango de fechas y usuario
  const filteredConversions = conversions.filter(c => {
    const conversionDate = new Date(c.timestamp);
    const inDateRange = conversionDate >= start && conversionDate <= end;
    const matchesUser = userId ? c.userId === userId : true;
    return inDateRange && matchesUser;
  });
  
  // Calcular métricas básicas
  const totalContacts = filteredContacts.length;
  const activeProspects = filteredContacts.filter(c => 
    c.status !== 'Cliente' && c.status !== 'Cuenta Vacia'
  ).length;
  
  const conversionsThisMonth = filteredConversions.filter(c => 
    c.toStatus === 'Cliente'
  ).length;
  
  // Calcular tasa de conversión basada en contactos que alguna vez fueron prospectos
  // Incluir contactos actuales que son prospectos + conversiones que vinieron de prospectos
  const currentProspects = filteredContacts.filter(c => c.status === 'Prospecto').length;
  const prospectsWhoConverted = filteredConversions.filter(c => 
    c.fromStatus === 'Prospecto' || c.toStatus === 'Cliente'
  ).length;
  const totalProspectsEver = currentProspects + prospectsWhoConverted;
  
  const conversionRate = totalProspectsEver > 0 
    ? (conversionsThisMonth / totalProspectsEver) * 100 
    : 0;
  
  // Calcular tiempo promedio de conversión
  const clientConversions = filteredConversions.filter(c => c.toStatus === 'Cliente');
  const averageTimeToConvert = clientConversions.length > 0
    ? clientConversions.reduce((acc, conversion) => {
        const contact = filteredContacts.find(c => c.id === conversion.contactId);
        if (contact) {
          return acc + daysBetween(new Date(contact.createdAt), new Date(conversion.timestamp));
        }
        return acc;
      }, 0) / clientConversions.length
    : 0;
  
  // Calcular distribución del pipeline
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
  
  filteredContacts.forEach(contact => {
    statusCounts[contact.status]++;
  });
  
  const pipelineDistribution: PipelineData[] = Object.entries(statusCounts).map(([status, count]) => ({
    status: status as ContactStatus,
    count,
    // Validar división por cero y valores válidos
    percentage: totalContacts > 0 && count >= 0 ? Math.round((count / totalContacts) * 100 * 100) / 100 : 0,
    averageTimeInStatus: 0 // Se calculará en una versión futura
  }));
  
  return {
    id: generateId(),
    userId,
    totalContacts,
    activeProspects,
    conversionsThisMonth,
    conversionRate: Math.round(conversionRate * 100) / 100,
    averageTimeToConvert: Math.round(averageTimeToConvert),
    pipelineDistribution,
    calculatedAt: new Date(),
    timeframe
  };
};

export const useMetricsStore = create<EnhancedMetricsState>()(
  persist(
    (set, get) => ({
      currentMetrics: null,
      historicalMetrics: [],
      conversions: [],
      isCalculating: false,
      // Team-level state
      teamMetrics: [],
      advisorMetrics: [],
      isCalculatingTeamMetrics: false,
      
      calculateMetrics: async (userId, timeframe = 'month') => {
        set({ isCalculating: true });
        
        try {
          const contacts = useCRMStore.getState().contacts;
          const { conversions } = get();
          
          const metrics = calculateMetricsFromContacts(
            contacts, 
            conversions, 
            userId, 
            timeframe
          );
          
          // Sincronizar con métricas reales de Supabase usando enhanced service con fallbacks
          try {
            const enhancedMetricsService = new EnhancedMetricsService();
            const realMetrics = await enhancedMetricsService.getCurrentMonthMetrics(userId);
            
            if (realMetrics) {
              // Actualizar métricas con datos reales
              metrics.totalContacts = realMetrics.total_contacts;
              metrics.conversionsThisMonth = realMetrics.converted_to_client;
              metrics.conversionRate = realMetrics.conversion_rate;
              metrics.averageTimeToConvert = realMetrics.average_conversion_time;
            }
          } catch (syncError: any) {
            console.warn('Could not sync with real metrics, using local fallback:', syncError?.message || syncError);
            
            // Implementar fallback local cuando falla la sincronización
            try {
              // Intentar obtener contactos directamente desde el store local
              const localContacts = useCRMStore.getState().contacts;
              if (localContacts && localContacts.length > 0) {
                const localMetrics = calculateMetricsFromContacts(
                  localContacts.filter(c => !userId || c.assignedTo === userId),
                  get().conversions.filter(c => !userId || c.userId === userId),
                  userId,
                  'month'
                );
                
                // Usar métricas locales como fallback
                metrics.totalContacts = localMetrics.totalContacts;
                metrics.conversionsThisMonth = localMetrics.conversionsThisMonth;
                metrics.conversionRate = localMetrics.conversionRate;
                metrics.averageTimeToConvert = localMetrics.averageTimeToConvert;
                
                console.info('Using local metrics as fallback');
              } else {
                console.warn('No local contacts available for fallback metrics');
              }
            } catch (fallbackError) {
              console.error('Fallback metrics calculation failed:', fallbackError);
              // Mantener métricas calculadas originalmente
            }
          }
          
          set(state => ({
            currentMetrics: metrics,
            historicalMetrics: [...state.historicalMetrics, metrics].slice(-50), // Mantener últimas 50
            isCalculating: false
          }));
          
          return metrics;
        } catch (error) {
          console.error('Error calculating metrics:', error);
          set({ isCalculating: false });
          throw error;
        }
      },
      
      recordConversion: async (conversion) => {
        set(state => ({
          conversions: [...state.conversions, conversion]
        }));
        
        // Recalcular métricas automáticamente
        await get().refreshMetrics();
      },
      
      getConversionRate: (fromStatus, toStatus) => {
        const { conversions } = get();
        const contacts = useCRMStore.getState().contacts;
        
        const relevantConversions = conversions.filter(c => 
          c.fromStatus === fromStatus && c.toStatus === toStatus
        );
        
        const contactsInFromStatus = contacts.filter(c => c.status === fromStatus).length;
        
        return contactsInFromStatus > 0 
          ? (relevantConversions.length / contactsInFromStatus) * 100 
          : 0;
      },
      
      getTrendData: (timeframe) => {
        const { historicalMetrics } = get();
        
        // Filtrar métricas por timeframe
        const relevantMetrics = historicalMetrics.filter(m => m.timeframe === timeframe);
        
        // Generar datos de tendencia
        return relevantMetrics.map((metric, index) => ({
          label: `Período ${index + 1}`,
          value: metric.conversionRate,
          metadata: {
            totalContacts: metric.totalContacts,
            conversions: metric.conversionsThisMonth,
            date: metric.calculatedAt
          }
        }));
      },
      
      getPerformanceIndicators: (userId) => {
        const { currentMetrics, historicalMetrics } = get();
        
        if (!currentMetrics) {
          return {
            totalContacts: 0,
            activeProspects: 0,
            conversionsThisMonth: 0,
            conversionRate: 0,
            averageTimeToConvert: 0,
            weeklyGrowth: 0,
            monthlyGrowth: 0,
            topPerformingStatus: 'Prospecto'
          };
        }
        
        // Calcular crecimiento semanal y mensual
        const previousMetrics = historicalMetrics
          .filter(m => m.userId === userId)
          .slice(-2);
        
        // Calcular crecimiento con validación contra división por cero
        const weeklyGrowth = previousMetrics.length >= 2 && previousMetrics[previousMetrics.length - 2].totalContacts > 0
          ? ((currentMetrics.totalContacts - previousMetrics[previousMetrics.length - 2].totalContacts) / previousMetrics[previousMetrics.length - 2].totalContacts) * 100
          : 0;
        
        const monthlyGrowth = previousMetrics.length >= 1 && previousMetrics[previousMetrics.length - 1].totalContacts > 0
          ? ((currentMetrics.totalContacts - previousMetrics[previousMetrics.length - 1].totalContacts) / previousMetrics[previousMetrics.length - 1].totalContacts) * 100
          : 0;
        
        // Encontrar el estado con mejor rendimiento con validación de array vacío
        const topPerformingStatus = currentMetrics.pipelineDistribution && currentMetrics.pipelineDistribution.length > 0
          ? currentMetrics.pipelineDistribution
              .reduce((max, current) => current.count > max.count ? current : max)
              .status
          : 'Prospecto';
        
        return {
          totalContacts: currentMetrics.totalContacts,
          activeProspects: currentMetrics.activeProspects,
          conversionsThisMonth: currentMetrics.conversionsThisMonth,
          conversionRate: currentMetrics.conversionRate,
          averageTimeToConvert: currentMetrics.averageTimeToConvert,
          weeklyGrowth: Math.round(weeklyGrowth * 100) / 100,
          monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
          topPerformingStatus
        };
      },
      
      refreshMetrics: async () => {
        const contacts = useCRMStore.getState().contacts;
        if (contacts.length > 0) {
          await get().calculateMetrics();
          
          // Guardar métricas históricas automáticamente
          try {
            const { HistoricalMetricsService } = await import('../services/historicalMetricsService');
            const historicalService = new HistoricalMetricsService();
            await historicalService.saveCurrentMetrics();
          } catch (error) {
            console.warn('Could not save historical metrics:', error);
          }
        }
      },
      
      // Team-level methods
      calculateTeamMetrics: async (teamId) => {
        set({ isCalculatingTeamMetrics: true });
        
        try {
          const { teams, teamMembers } = useTeamStore.getState();
          const contacts = useCRMStore.getState().contacts;
          const { conversions } = get();
          
          const team = teamId ? teams.find(t => t.id === teamId) : teams[0];
          if (!team) {
            throw new Error('Team not found');
          }
          
          // Get team members for this team
          const members = teamMembers.filter(tm => tm.team_id === team.id && tm.user);
          
          // Calculate metrics for each team member
          const memberMetrics: AdvisorMetrics[] = [];
          let totalContacts = 0;
          let totalConversions = 0;
          
          for (const teamMember of members) {
            const member = teamMember.user!;
            const memberContacts = contacts.filter(c => c.assignedTo === member.id);
            const memberConversions = conversions.filter(c => c.userId === member.id);
            
            const metrics = calculateMetricsFromContacts(
              memberContacts,
              memberConversions,
              member.id,
              'month'
            );
            
            const advisorMetric: AdvisorMetrics = {
              userId: member.id,
              name: member.full_name || member.email,
              email: member.email,
              role: member.role,
              totalContacts: metrics.totalContacts,
              conversionsThisMonth: metrics.conversionsThisMonth,
              conversionRate: metrics.conversionRate,
              averageTimeToConvert: metrics.averageTimeToConvert,
              pipelineDistribution: metrics.pipelineDistribution,
              weeklyGrowth: 0, // Will be calculated with historical data
              monthlyGrowth: 0, // Will be calculated with historical data
              rank: 0, // Will be set after sorting
              calculatedAt: new Date()
            };
            
            memberMetrics.push(advisorMetric);
            totalContacts += metrics.totalContacts;
            totalConversions += metrics.conversionsThisMonth;
          }
          
          // Sort by conversion rate and assign ranks
          memberMetrics.sort((a, b) => b.conversionRate - a.conversionRate);
          memberMetrics.forEach((metric, index) => {
            metric.rank = index + 1;
          });
          
          const averageConversionRate = memberMetrics.length > 0
            ? memberMetrics.reduce((sum, m) => sum + m.conversionRate, 0) / memberMetrics.length
            : 0;
          
          const topPerformer = memberMetrics[0] || {
            userId: '',
            name: 'N/A',
            conversionRate: 0
          };
          
          const teamMetrics: TeamMetrics = {
            teamId: team.id,
            teamName: team.name,
            totalContacts,
            totalConversions,
            averageConversionRate: Math.round(averageConversionRate * 100) / 100,
            topPerformer,
            memberMetrics,
            calculatedAt: new Date()
          };
          
          set(state => ({
            teamMetrics: [...state.teamMetrics.filter(tm => tm.teamId !== team.id), teamMetrics],
            advisorMetrics: memberMetrics,
            isCalculatingTeamMetrics: false
          }));
          
          return teamMetrics;
        } catch (error) {
          console.error('Error calculating team metrics:', error);
          set({ isCalculatingTeamMetrics: false });
          throw error;
        }
      },
      
      calculateAllAdvisorMetrics: async () => {
        set({ isCalculatingTeamMetrics: true });
        
        try {
          const { teams, teamMembers } = useTeamStore.getState();
          const contacts = useCRMStore.getState().contacts;
          const { conversions } = get();
          
          const allAdvisorMetrics: AdvisorMetrics[] = [];
          
          for (const team of teams) {
            const members = teamMembers.filter(tm => tm.team_id === team.id && tm.user);
            
            for (const teamMember of members) {
              const member = teamMember.user!;
              const memberContacts = contacts.filter(c => c.assignedTo === member.id);
              const memberConversions = conversions.filter(c => c.userId === member.id);
              
              const metrics = calculateMetricsFromContacts(
                memberContacts,
                memberConversions,
                member.id,
                'month'
              );
              
              const advisorMetric: AdvisorMetrics = {
                userId: member.id,
                name: member.full_name || member.email,
                email: member.email,
                role: member.role,
                totalContacts: metrics.totalContacts,
                conversionsThisMonth: metrics.conversionsThisMonth,
                conversionRate: metrics.conversionRate,
                averageTimeToConvert: metrics.averageTimeToConvert,
                pipelineDistribution: metrics.pipelineDistribution,
                weeklyGrowth: 0,
                monthlyGrowth: 0,
                rank: 0,
                calculatedAt: new Date()
              };
              
              allAdvisorMetrics.push(advisorMetric);
            }
          }
          
          // Sort by conversion rate and assign ranks
          allAdvisorMetrics.sort((a, b) => b.conversionRate - a.conversionRate);
          allAdvisorMetrics.forEach((metric, index) => {
            metric.rank = index + 1;
          });
          
          set(state => ({
            advisorMetrics: allAdvisorMetrics,
            isCalculatingTeamMetrics: false
          }));
          
          return allAdvisorMetrics;
        } catch (error) {
          console.error('Error calculating advisor metrics:', error);
          set({ isCalculatingTeamMetrics: false });
          throw error;
        }
      },
      
      getTeamPerformanceComparison: (teamId) => {
        const { teamMetrics } = get();
        const team = teamMetrics.find(tm => tm.teamId === teamId);
        return team ? team.memberMetrics : [];
      },
      
      getTopPerformers: (limit = 5) => {
        const { advisorMetrics } = get();
        return advisorMetrics
          .sort((a, b) => b.conversionRate - a.conversionRate)
          .slice(0, limit);
      },
      
      refreshTeamMetrics: async () => {
        const { teams } = useTeamStore.getState();
        
        for (const team of teams) {
          await get().calculateTeamMetrics(team.id);
        }
        
        await get().calculateAllAdvisorMetrics();
      },
      
      // Nuevo método para cargar métricas históricas
      loadHistoricalMetrics: async (days: number = 30) => {
        try {
          const { HistoricalMetricsService } = await import('../services/historicalMetricsService');
          const historicalService = new HistoricalMetricsService();
          const historicalData = await historicalService.getLastNDaysMetrics(days);
          
          // Convertir datos históricos al formato del store
          const convertedMetrics = historicalData.map(entry => ({
            id: entry.id || generateId(),
            userId: entry.user_id,
            totalContacts: entry.total_contacts,
            activeProspects: entry.pipeline_contacts,
            conversionsThisMonth: entry.converted_contacts,
            conversionRate: entry.conversion_rate,
            averageTimeToConvert: 0, // No disponible en historical_metrics
            pipelineDistribution: [], // Se calculará si es necesario
            calculatedAt: new Date(entry.date),
            timeframe: 'month' as TimeFrame
          }));
          
          set(state => ({
            historicalMetrics: [...state.historicalMetrics, ...convertedMetrics].slice(-50)
          }));
          
          return convertedMetrics;
        } catch (error) {
          console.error('Error loading historical metrics:', error);
          return [];
        }
      }
    }),
    {
      name: 'metrics-storage',
      partialize: (state) => ({
        historicalMetrics: state.historicalMetrics.slice(-20), // Mantener últimas 20
        conversions: state.conversions.slice(-100), // Mantener últimas 100
        teamMetrics: state.teamMetrics.slice(-10), // Mantener últimas 10 team metrics
        advisorMetrics: state.advisorMetrics.slice(-50) // Mantener últimas 50 advisor metrics
      })
    }
  )
);

// Hook para obtener métricas en tiempo real
export const useRealtimeMetrics = (userId?: string, timeframe: TimeFrame = 'month') => {
  const { currentMetrics, calculateMetrics, isCalculating } = useMetricsStore();
  
  // Recalcular métricas si no existen o si han pasado más de 5 minutos
  const shouldRecalculate = !currentMetrics || 
    (new Date().getTime() - new Date(currentMetrics.calculatedAt).getTime()) > 5 * 60 * 1000;
  
  if (shouldRecalculate && !isCalculating) {
    calculateMetrics(userId, timeframe);
  }
  
  return {
    metrics: currentMetrics,
    isLoading: isCalculating,
    refresh: () => calculateMetrics(userId, timeframe)
  };
};