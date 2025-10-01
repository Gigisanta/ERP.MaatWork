import { supabase } from '@cactus/database';
import { HistoricalMetricsEntry } from './historicalMetricsService';

export interface TeamPerformanceMetrics {
  team_id?: string;
  total_contacts: number;
  total_conversions: number;
  conversion_rate: number;
  avg_conversion_time_days: number;
  top_performers: {
    user_id: string;
    user_name: string;
    conversions: number;
    conversion_rate: number;
  }[];
  status_distribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  monthly_trends: {
    month: string;
    conversions: number;
    conversion_rate: number;
  }[];
}

export interface ConversionAnalytics {
  total_conversions: number;
  conversion_rate: number;
  avg_conversion_time: number;
  conversion_funnel: {
    stage: string;
    count: number;
    conversion_rate: number;
  }[];
  time_series: {
    date: string;
    conversions: number;
    total_contacts: number;
    rate: number;
  }[];
}

export class PerformanceQueriesService {
  
  /**
   * Obtiene métricas de rendimiento del equipo para un período específico
   */
  async getTeamPerformanceMetrics(startDate: string, endDate: string): Promise<TeamPerformanceMetrics> {
    try {
      // Obtener conversiones del período
      const { data: conversions, error: conversionsError } = await supabase
        .from('contact_status_history')
        .select('*')
        .eq('to_status', 'Cliente')
        .gte('changed_at', startDate)
        .lte('changed_at', endDate);

      if (conversionsError) throw conversionsError;

      // Obtener total de contactos del período
      const { data: totalContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (contactsError) throw contactsError;

      // Calcular métricas básicas
      const totalConversions = conversions?.length || 0;
      const totalContactsCount = totalContacts?.length || 0;
      const conversionRate = totalContactsCount > 0 ? (totalConversions / totalContactsCount) * 100 : 0;

      // Obtener distribución por estado
      const { data: statusDistribution, error: statusError } = await supabase
        .from('contacts')
        .select('status')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (statusError) throw statusError;

      // Procesar distribución por estado
      const statusCounts = statusDistribution?.reduce((acc, contact) => {
        acc[contact.status] = (acc[contact.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const statusDistributionArray = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: totalContactsCount > 0 ? (count / totalContactsCount) * 100 : 0
      }));

      // Obtener tendencias mensuales (últimos 6 meses)
      const monthlyTrends = await this.getMonthlyTrends(6);

      return {
        total_contacts: totalContactsCount,
        total_conversions: totalConversions,
        conversion_rate: conversionRate,
        avg_conversion_time_days: 0, // TODO: calcular tiempo promedio de conversión
        top_performers: [], // TODO: implementar análisis de top performers
        status_distribution: statusDistributionArray,
        monthly_trends: monthlyTrends
      };
    } catch (error) {
      console.error('Error obteniendo métricas de rendimiento del equipo:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis detallado de conversiones
   */
  async getConversionAnalytics(startDate: string, endDate: string): Promise<ConversionAnalytics> {
    try {
      // Obtener historial de cambios de estado
      const { data: statusHistory, error } = await supabase
        .from('contact_status_history')
        .select('*')
        .gte('changed_at', startDate)
        .lte('changed_at', endDate)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      // Calcular conversiones
      const conversions = statusHistory?.filter(h => h.to_status === 'Cliente') || [];
      const totalConversions = conversions.length;

      // Obtener total de contactos únicos en el período
      const uniqueContacts = new Set(statusHistory?.map(h => h.contact_id) || []);
      const totalUniqueContacts = uniqueContacts.size;
      const conversionRate = totalUniqueContacts > 0 ? (totalConversions / totalUniqueContacts) * 100 : 0;

      // Crear serie temporal diaria
      const timeSeries = await this.createDailyTimeSeries(startDate, endDate, statusHistory || []);

      // Crear embudo de conversión
      const conversionFunnel = this.createConversionFunnel(statusHistory || []);

      return {
        total_conversions: totalConversions,
        conversion_rate: conversionRate,
        avg_conversion_time: 0, // TODO: calcular tiempo promedio
        conversion_funnel: conversionFunnel,
        time_series: timeSeries
      };
    } catch (error) {
      console.error('Error obteniendo análisis de conversiones:', error);
      throw error;
    }
  }

  /**
   * Obtiene tendencias mensuales
   */
  private async getMonthlyTrends(months: number): Promise<{ month: string; conversions: number; conversion_rate: number; }[]> {
    try {
      const { data: monthlyMetrics, error } = await supabase
        .from('monthly_conversion_metrics')
        .select('*')
        .order('month', { ascending: false })
        .limit(months);

      if (error) throw error;

      return monthlyMetrics?.map(metric => ({
        month: metric.month,
        conversions: metric.converted_contacts,
        conversion_rate: metric.conversion_rate
      })).reverse() || [];
    } catch (error) {
      console.error('Error obteniendo tendencias mensuales:', error);
      return [];
    }
  }

  /**
   * Crea serie temporal diaria
   */
  private async createDailyTimeSeries(startDate: string, endDate: string, statusHistory: any[]): Promise<{
    date: string;
    conversions: number;
    total_contacts: number;
    rate: number;
  }[]> {
    const timeSeries: { date: string; conversions: number; total_contacts: number; rate: number; }[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Contar conversiones del día
      const dayConversions = statusHistory.filter(h => 
        h.to_status === 'Cliente' && 
        h.changed_at.startsWith(dateStr)
      ).length;

      // Contar contactos únicos hasta ese día
      const contactsUpToDate = new Set(
        statusHistory
          .filter(h => h.changed_at <= dateStr + 'T23:59:59')
          .map(h => h.contact_id)
      ).size;

      const rate = contactsUpToDate > 0 ? (dayConversions / contactsUpToDate) * 100 : 0;

      timeSeries.push({
        date: dateStr,
        conversions: dayConversions,
        total_contacts: contactsUpToDate,
        rate
      });
    }

    return timeSeries;
  }

  /**
   * Crea embudo de conversión
   */
  private createConversionFunnel(statusHistory: any[]): {
    stage: string;
    count: number;
    conversion_rate: number;
  }[] {
    const stages = ['Prospecto', 'Contactado', 'Primera reunión', 'Segunda reunión', 'Cliente'];
    const stageCounts: Record<string, Set<string>> = {};

    // Inicializar contadores
    stages.forEach(stage => {
      stageCounts[stage] = new Set();
    });

    // Contar contactos únicos por etapa
    statusHistory.forEach(history => {
      if (stages.includes(history.to_status)) {
        stageCounts[history.to_status].add(history.contact_id);
      }
    });

    // Calcular embudo
    const funnel = stages.map((stage, index) => {
      const count = stageCounts[stage].size;
      const previousStageCount = index > 0 ? stageCounts[stages[index - 1]].size : count;
      const conversionRate = previousStageCount > 0 ? (count / previousStageCount) * 100 : 0;

      return {
        stage,
        count,
        conversion_rate: conversionRate
      };
    });

    return funnel;
  }

  /**
   * Obtiene métricas de rendimiento por usuario
   */
  async getUserPerformanceMetrics(userId: string, startDate: string, endDate: string): Promise<{
    user_id: string;
    total_contacts: number;
    conversions: number;
    conversion_rate: number;
    avg_response_time: number;
    activity_score: number;
  }> {
    try {
      // Obtener conversiones del usuario
      const { data: userConversions, error: conversionsError } = await supabase
        .from('contact_status_history')
        .select('*')
        .eq('changed_by', userId)
        .eq('to_status', 'Cliente')
        .gte('changed_at', startDate)
        .lte('changed_at', endDate);

      if (conversionsError) throw conversionsError;

      // Obtener total de contactos del usuario
      const { data: userContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .eq('assigned_to', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (contactsError) throw contactsError;

      const totalContacts = userContacts?.length || 0;
      const conversions = userConversions?.length || 0;
      const conversionRate = totalContacts > 0 ? (conversions / totalContacts) * 100 : 0;

      return {
        user_id: userId,
        total_contacts: totalContacts,
        conversions,
        conversion_rate: conversionRate,
        avg_response_time: 0, // TODO: calcular tiempo promedio de respuesta
        activity_score: 0 // TODO: calcular puntuación de actividad
      };
    } catch (error) {
      console.error('Error obteniendo métricas de rendimiento del usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene comparación de rendimiento entre períodos
   */
  async getPerformanceComparison(currentStart: string, currentEnd: string, previousStart: string, previousEnd: string): Promise<{
    current_period: TeamPerformanceMetrics;
    previous_period: TeamPerformanceMetrics;
    growth_rates: {
      contacts_growth: number;
      conversions_growth: number;
      rate_improvement: number;
    };
  }> {
    try {
      const currentMetrics = await this.getTeamPerformanceMetrics(currentStart, currentEnd);
      const previousMetrics = await this.getTeamPerformanceMetrics(previousStart, previousEnd);

      // Calcular tasas de crecimiento
      const contactsGrowth = previousMetrics.total_contacts > 0 
        ? ((currentMetrics.total_contacts - previousMetrics.total_contacts) / previousMetrics.total_contacts) * 100
        : 0;

      const conversionsGrowth = previousMetrics.total_conversions > 0
        ? ((currentMetrics.total_conversions - previousMetrics.total_conversions) / previousMetrics.total_conversions) * 100
        : 0;

      const rateImprovement = currentMetrics.conversion_rate - previousMetrics.conversion_rate;

      return {
        current_period: currentMetrics,
        previous_period: previousMetrics,
        growth_rates: {
          contacts_growth: contactsGrowth,
          conversions_growth: conversionsGrowth,
          rate_improvement: rateImprovement
        }
      };
    } catch (error) {
      console.error('Error obteniendo comparación de rendimiento:', error);
      throw error;
    }
  }
}

export default PerformanceQueriesService;