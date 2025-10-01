import { supabase } from '@cactus/database';
import { MetricsService } from './metricsService';
import { format, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import type {
  HistoricalMetricsEnhanced,
  DataRetentionConfig,
  MetricAlert,
  HistoricalMetricsRequest,
  HistoricalMetricsResponse,
  TrendCalculation,
  Granularity
} from '../types/historicalMetrics';

export interface HistoricalMetricsEntry {
  id?: string;
  date: string;
  total_contacts: number;
  active_contacts: number;
  pipeline_contacts: number;
  conversion_rate: number;
  converted_contacts: number;
  team_id?: string;
  user_id?: string;
  created_at?: string;
}

export class HistoricalMetricsService {
  private metricsService: MetricsService;
  private retentionConfig: DataRetentionConfig | null = null;

  constructor() {
    this.metricsService = new MetricsService();
    this.loadRetentionConfig();
  }

  /**
   * Carga la configuración de retención de datos
   */
  private async loadRetentionConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('data_retention_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      // Si no hay configuración activa, usar defaults seguros
      this.retentionConfig = data ?? {
        id: undefined as any,
        is_active: true,
        retention_days: 365,
        soft_delete: true,
        purge_anonymized: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any;
    } catch (error) {
      console.error('Error loading retention config:', error);
    }
  }

  /**
   * Guarda métricas en la tabla enhanced con metadatos
   */
  async saveEnhancedMetrics(metricKey: string, value: number, metadata?: Record<string, any>): Promise<HistoricalMetricsEnhanced | null> {
    try {
      const metricData: Omit<HistoricalMetricsEnhanced, 'id' | 'created_at' | 'updated_at'> = {
        date: new Date().toISOString().split('T')[0],
        granularity: 'daily' as Granularity,
        total_contacts: typeof value === 'number' ? value : 0,
        new_contacts: 0,
        active_contacts: 0,
        pipeline_contacts: 0,
        converted_contacts: 0,
        conversion_rate: 0,
        average_conversion_time: 0,
        pipeline_value: 0,
        closed_value: 0,
        average_deal_size: 0,
        total_value: 0,
        calculated_at: new Date().toISOString(),
        data_quality_score: this.calculateDataQuality(value, metadata)
      };

      const { data, error } = await supabase
        .from('historical_metrics_enhanced')
        .insert([metricData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving enhanced metrics:', error);
      throw error;
    }
  }

  /**
   * Calcula la calidad de los datos basada en el valor y metadatos
   */
  private calculateDataQuality(value: number, metadata?: Record<string, any>): number {
    let quality = 0.8; // Base quality score
    
    // Check if value is valid
    if (typeof value === 'number' && !isNaN(value) && value >= 0) {
      quality += 0.1;
    }
    
    // Check metadata completeness
    if (metadata && Object.keys(metadata).length > 0) {
      quality += 0.1;
    }
    
    return Math.min(1.0, quality);
  }

  /**
   * Guarda las métricas actuales en el historial (método legacy)
   */
  async saveCurrentMetrics(): Promise<void> {
    try {
      const currentMetrics = await this.metricsService.getCurrentMonthMetrics();
      const today = new Date().toISOString().split('T')[0];

      // Verificar si ya existe una entrada para hoy
      const { data: existingEntry } = await supabase
        .from('historical_metrics')
        .select('id')
        .eq('date', today)
        .maybeSingle();

      // Calcular métricas derivadas correctamente
      const totalContacts = currentMetrics?.total_contacts || 0;
      const convertedToClient = currentMetrics?.converted_to_client || 0;
      const conversionRate = currentMetrics?.conversion_rate || 0;
      
      // Obtener contactos actuales para calcular métricas adicionales
      const { data: contacts } = await supabase
        .from('contacts')
        .select('status');
      
      const activeContacts = contacts?.filter(c => c.status === 'Cliente').length || 0;
      const pipelineContacts = contacts?.filter(c => 
        c.status !== 'Cliente' && c.status !== 'Cuenta Vacia'
      ).length || 0;

      const metricsEntry: HistoricalMetricsEntry = {
        date: today,
        total_contacts: Math.max(0, totalContacts),
        active_contacts: Math.max(0, activeContacts),
        pipeline_contacts: Math.max(0, pipelineContacts),
        conversion_rate: Math.max(0, Math.min(100, conversionRate)),
        converted_contacts: Math.max(0, convertedToClient)
      };

      if (existingEntry) {
        // Actualizar entrada existente
        const { error } = await supabase
          .from('historical_metrics')
          .update(metricsEntry)
          .eq('id', existingEntry.id);

        if (error) throw error;
      } else {
        // Crear nueva entrada
        const { error } = await supabase
          .from('historical_metrics')
          .insert([metricsEntry]);

        if (error) throw error;
      }

      // También guardar en la tabla enhanced
      await this.saveEnhancedMetrics('total_contacts', metricsEntry.total_contacts, {
        active_contacts: metricsEntry.active_contacts,
        date: today
      });
      
      await this.saveEnhancedMetrics('conversion_rate', metricsEntry.conversion_rate, {
        converted_contacts: metricsEntry.converted_contacts,
        date: today
      });

      console.log('Métricas históricas guardadas exitosamente');
    } catch (error) {
      console.error('Error guardando métricas históricas:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas enhanced por rango de fechas y clave de métrica
   */
  async getEnhancedMetrics(request: HistoricalMetricsRequest): Promise<HistoricalMetricsResponse> {
    try {
      let query = supabase
        .from('historical_metrics_enhanced')
        .select('*')
        // Filter by metric type if needed
        .gte('recorded_at', request.startDate)
        .lte('recorded_at', request.endDate)
        .order('recorded_at', { ascending: true });

      // Apply default limit
      query = query.limit(50);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
        pagination: {
          page: 1,
          limit: 50,
          total: count || data?.length || 0,
          totalPages: Math.ceil((count || data?.length || 0) / 50)
        }
      };
    } catch (error) {
      console.error('Error getting enhanced metrics:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas históricas por rango de fechas (método legacy)
   */
  async getHistoricalMetrics(startDate: string, endDate: string): Promise<HistoricalMetricsEntry[]> {
    try {
      const { data, error } = await supabase
        .from('historical_metrics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo métricas históricas:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas de los últimos N días
   */
  async getLastNDaysMetrics(days: number): Promise<HistoricalMetricsEntry[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return this.getHistoricalMetrics(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }

  /**
   * Obtiene métricas del mes actual
   */
  async getCurrentMonthHistoricalMetrics(): Promise<HistoricalMetricsEntry[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.getHistoricalMetrics(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
  }

  /**
   * Calcula tendencias avanzadas para métricas enhanced
   */
  async calculateEnhancedTrends(metricKey: string, days: number = 30): Promise<TrendCalculation> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days);
      const previousStartDate = subDays(startDate, days);

      const [currentPeriod, previousPeriod] = await Promise.all([
        this.getEnhancedMetrics({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity: 'daily'
        }),
        this.getEnhancedMetrics({
          startDate: previousStartDate.toISOString(),
          endDate: startDate.toISOString(),
          granularity: 'daily'
        })
      ]);

      const currentAvg = this.calculateAverage(currentPeriod.data.map(d => d.total_contacts));
      const previousAvg = this.calculateAverage(previousPeriod.data.map(d => d.total_contacts));
      
      const percentageChange = previousAvg !== 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;
      const direction: 'up' | 'down' | 'stable' = 
        Math.abs(percentageChange) < 1 ? 'stable' :
        percentageChange > 0 ? 'up' : 'down';

      return {
        current: currentAvg,
        previous: previousAvg,
        change: currentAvg - previousAvg,
        percentageChange,
        direction,
        confidence: this.calculateConfidence(currentPeriod.data, previousPeriod.data)
      };
    } catch (error) {
      console.error('Error calculating enhanced trends:', error);
      throw error;
    }
  }

  /**
   * Calcula el promedio de un array de números
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calcula la confianza de la tendencia basada en la calidad y cantidad de datos
   */
  private calculateConfidence(current: HistoricalMetricsEnhanced[], previous: HistoricalMetricsEnhanced[]): number {
    const currentQuality = this.calculateAverage(current.map(d => d.data_quality_score));
    const previousQuality = this.calculateAverage(previous.map(d => d.data_quality_score));
    
    const dataPoints = current.length + previous.length;
    const qualityScore = (currentQuality + previousQuality) / 2;
    
    // Más datos y mejor calidad = mayor confianza
    return Math.min(0.95, (dataPoints / 60) * qualityScore);
  }

  /**
   * Calcula tendencias comparando con el período anterior (método legacy)
   */
  async calculateTrends(days: number = 30): Promise<{
    current: HistoricalMetricsEntry | null;
    previous: HistoricalMetricsEntry | null;
    trends: {
      totalContacts: number;
      conversionRate: number;
      conversionsCount: number;
    };
  }> {
    try {
      const currentPeriodMetrics = await this.getLastNDaysMetrics(days);
      const previousPeriodStart = new Date();
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
      const previousPeriodEnd = new Date();
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

      const previousPeriodMetrics = await this.getHistoricalMetrics(
        previousPeriodStart.toISOString().split('T')[0],
        previousPeriodEnd.toISOString().split('T')[0]
      );

      const current = currentPeriodMetrics[currentPeriodMetrics.length - 1] || null;
      const previous = previousPeriodMetrics[previousPeriodMetrics.length - 1] || null;

      const trends = {
        totalContacts: current && previous ? 
          ((current.total_contacts - previous.total_contacts) / previous.total_contacts) * 100 : 0,
        conversionRate: current && previous ? 
          current.conversion_rate - previous.conversion_rate : 0,
        conversionsCount: current && previous ? 
          ((current.converted_contacts - previous.converted_contacts) / previous.converted_contacts) * 100 : 0
      };

      return { current, previous, trends };
    } catch (error) {
      console.error('Error calculando tendencias:', error);
      throw error;
    }
  }

  /**
   * Crea o actualiza alertas de métricas
   */
  async createMetricAlert(alert: Omit<MetricAlert, 'id' | 'created_at' | 'updated_at'>): Promise<MetricAlert | null> {
    try {
      const { data, error } = await supabase
        .from('metric_alerts')
        .insert([alert])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating metric alert:', error);
      throw error;
    }
  }

  /**
   * Verifica alertas para una métrica específica
   */
  async checkMetricAlerts(metricKey: string, currentValue: number): Promise<MetricAlert[]> {
    try {
      const { data: alerts, error } = await supabase
        .from('metric_alerts')
        .select('*')
        .eq('metric_key', metricKey)
        .eq('is_active', true);

      if (error) throw error;
      if (!alerts) return [];

      const triggeredAlerts: MetricAlert[] = [];

      for (const alert of alerts) {
        let triggered = false;
        
        switch (alert.condition_type) {
          case 'greater_than':
            triggered = currentValue > alert.threshold_value;
            break;
          case 'less_than':
            triggered = currentValue < alert.threshold_value;
            break;
          case 'equals':
            triggered = Math.abs(currentValue - alert.threshold_value) < 0.01;
            break;
          case 'percentage_change':
            // Implementar lógica de cambio porcentual
            const trend = await this.calculateEnhancedTrends(metricKey, 1);
            triggered = Math.abs(trend.percentageChange) > alert.threshold_value;
            break;
        }

        if (triggered) {
          triggeredAlerts.push(alert);
        }
      }

      return triggeredAlerts;
    } catch (error) {
      console.error('Error checking metric alerts:', error);
      return [];
    }
  }

  /**
   * Limpia datos antiguos según la configuración de retención
   */
  async cleanupOldData(): Promise<void> {
    try {
      if (!this.retentionConfig) {
        await this.loadRetentionConfig();
      }

      if (!this.retentionConfig) {
        console.log('No retention config found, skipping cleanup');
        return;
      }

      const cutoffDate = subDays(new Date(), this.retentionConfig.daily_retention_days);

      // Limpiar métricas enhanced
      const { error: enhancedError } = await supabase
        .from('historical_metrics_enhanced')
        .delete()
        .lt('recorded_at', cutoffDate.toISOString());

      if (enhancedError) throw enhancedError;

      // Limpiar métricas legacy
      const { error: legacyError } = await supabase
        .from('historical_metrics')
        .delete()
        .lt('date', format(cutoffDate, 'yyyy-MM-dd'));

      if (legacyError) throw legacyError;

      console.log(`Cleaned up data older than ${this.retentionConfig.daily_retention_days} days`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  /**
   * Exporta datos históricos en formato JSON
   */
  async exportHistoricalData(metricKey: string, startDate: string, endDate: string): Promise<any> {
    try {
      const response = await this.getEnhancedMetrics({
        startDate,
        endDate,
        granularity: 'daily'
      });

      return {
        metricKey,
        exportDate: new Date().toISOString(),
        dateRange: { startDate, endDate },
        totalRecords: response.pagination?.total || response.data.length,
        data: response.data,
        summary: {
          average: this.calculateAverage(response.data.map(d => d.total_contacts)),
          min: Math.min(...response.data.map(d => d.total_contacts)),
          max: Math.max(...response.data.map(d => d.total_contacts)),
          averageQuality: this.calculateAverage(response.data.map(d => d.data_quality_score))
        }
      };
    } catch (error) {
      console.error('Error exporting historical data:', error);
      throw error;
    }
  }

  /**
   * Inicia el guardado automático de métricas (cada hora)
   */
  startAutomaticSaving(): NodeJS.Timeout {
    console.log('Iniciando guardado automático de métricas históricas');
    
    // Guardar inmediatamente
    this.saveCurrentMetrics().catch(console.error);
    
    // Configurar intervalo cada hora
    return setInterval(async () => {
      try {
        await this.saveCurrentMetrics();
        // También ejecutar limpieza periódica (una vez al día)
        const now = new Date();
        if (now.getHours() === 2 && now.getMinutes() < 5) { // 2 AM
          await this.cleanupOldData();
        }
      } catch (error) {
        console.error('Error in automatic saving:', error);
      }
    }, 60 * 60 * 1000); // 1 hora
  }

  /**
   * Detiene el guardado automático
   */
  stopAutomaticSaving(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('Guardado automático de métricas detenido');
  }
}

export default HistoricalMetricsService;