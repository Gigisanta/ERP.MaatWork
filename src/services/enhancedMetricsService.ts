import { supabase } from '../config/supabase';
import { MetricsService, MonthlyConversionMetric, HistoricalMetric } from './metricsService';
import { SupabaseErrorHandler, withErrorHandling } from '../utils/supabaseErrorHandler';
import { Contact } from '../types/metrics';

/**
 * Enhanced metrics service with improved error handling and connection management
 */
export class EnhancedMetricsService {
  private metricsService: MetricsService;
  private connectionHealthy: boolean = true;
  private lastHealthCheck: Date = new Date();
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.metricsService = new MetricsService();
    this.startHealthMonitoring();
  }

  /**
   * Starts monitoring connection health
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkConnectionHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Checks if the Supabase connection is healthy
   */
  async checkConnectionHealth(): Promise<boolean> {
    try {
      return await SupabaseErrorHandler.executeWithRetry(async () => {
        // Use a simple query that doesn't depend on specific table structure
        const { data, error } = await supabase
          .from('contacts')
          .select('count', { count: 'exact', head: true })
          .limit(1);
        
        if (error) {
          console.error('Health check query error:', error);
          throw error;
        }
        
        console.log('✅ Health check successful - Supabase connection is healthy');
        return true;
      }, 5, 2000);
    } catch (error) {
      console.error('❌ Health check failed after all retries:', {
        error: error?.message || error,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Gets connection status information
   */
  getConnectionStatus(): { healthy: boolean; lastCheck: Date; message: string } {
    const timeSinceCheck = Date.now() - this.lastHealthCheck.getTime();
    const isStale = timeSinceCheck > this.HEALTH_CHECK_INTERVAL * 2;

    return {
      healthy: this.connectionHealthy && !isStale,
      lastCheck: this.lastHealthCheck,
      message: this.connectionHealthy 
        ? 'Connection is healthy' 
        : 'Connection issues detected'
    };
  }

  /**
   * Get monthly conversion metrics with enhanced error handling
   */
  async getMonthlyConversionMetrics(userId?: string): Promise<any[]> {
    return SupabaseErrorHandler.executeWithRetry(async () => {
      const metricsService = new MetricsService();
      return await metricsService.getMonthlyConversionMetrics(undefined, undefined, userId);
    }, 3, 1000);
  }

  /**
   * Get current month metrics with enhanced error handling
   */
  async getCurrentMonthMetrics(userId?: string): Promise<MonthlyConversionMetric | null> {
    return SupabaseErrorHandler.executeWithRetry(
      () => this.metricsService.getCurrentMonthMetrics(userId),
      3,
      1000
    );
  }

  /**
   * Enhanced method to get contacts with error handling and caching
   */
  async getContactsFromSupabase(userId?: string): Promise<Contact[]> {
    return SupabaseErrorHandler.executeWithRetry(
      () => this.metricsService.getContactsFromSupabase(userId),
      3,
      1000
    );
  }

  /**
   * Enhanced method to calculate and store monthly metrics with validation
   */
  async calculateAndStoreMonthlyMetrics(
    year: number, 
    month: number, 
    userId?: string
  ): Promise<MonthlyConversionMetric> {
    // Validate input parameters
    if (!year || year < 2020 || year > new Date().getFullYear() + 1) {
      throw new Error('Invalid year parameter');
    }
    
    if (!month || month < 1 || month > 12) {
      throw new Error('Invalid month parameter');
    }

    return SupabaseErrorHandler.executeWithRetry(
      () => this.metricsService.calculateAndStoreMonthlyMetrics(year, month, userId),
      3,
      1000
    );
  }

  /**
   * Get historical metrics with enhanced error handling
   */
  async getHistoricalMetrics(userId?: string, startDate?: string, endDate?: string): Promise<HistoricalMetric[]> {
    return SupabaseErrorHandler.executeWithRetry(
      () => this.metricsService.getHistoricalMetrics(userId, startDate, endDate),
      3,
      1000
    );
  }

  /**
   * Enhanced method to log status changes with validation
   */
  async logStatusChange(
    contactId: string, 
    fromStatus: string | null, 
    toStatus: string, 
    changedBy?: string, 
    notes?: string
  ): Promise<any | null> {
    // Validate required parameters
    if (!contactId || !toStatus) {
      throw new Error('Contact ID and target status are required');
    }

    return SupabaseErrorHandler.executeWithRetry(async () => {
      const metricsService = new MetricsService();
      return await metricsService.logStatusChange(contactId, fromStatus, toStatus, changedBy, notes);
    }, 3, 1000).catch((error) => {
      console.warn('Failed to log status change:', error.message);
      return null;
    });
  }



  /**
   * Gets service health information
   */
  getServiceHealth(): {
    connection: { healthy: boolean; lastCheck: Date; message: string };
    metrics: { available: boolean; lastUpdate?: Date };
  } {
    return {
      connection: this.getConnectionStatus(),
      metrics: {
        available: this.connectionHealthy,
        lastUpdate: this.lastHealthCheck
      }
    };
  }
}

// Export singleton instance
export const enhancedMetricsService = new EnhancedMetricsService();