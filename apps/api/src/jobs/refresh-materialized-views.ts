/**
 * Job para refrescar materialized views
 * 
 * Refresca las materialized views que pre-calculan agregaciones frecuentes
 * para mejorar el rendimiento de queries.
 * 
 * Se ejecuta:
 * - Diariamente después del job de valuación
 * - Después de imports AUM (refresh incremental de mv_contact_aum_summary)
 */

import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'refresh-materialized-views' });

export class RefreshMaterializedViewsJob {
  /**
   * Refrescar todas las materialized views
   */
  async refreshAll(): Promise<void> {
    logger.info('🔄 Iniciando refresh de todas las materialized views...');
    
    try {
      await db().execute(sql`SELECT refresh_all_materialized_views()`);
      logger.info('✅ Refresh de todas las materialized views completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando materialized views');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_team_metrics_daily
   */
  async refreshTeamMetrics(): Promise<void> {
    logger.info('🔄 Refrescando mv_team_metrics_daily...');
    
    try {
      await db().execute(sql`SELECT refresh_mv_team_metrics_daily()`);
      logger.info('✅ Refresh de mv_team_metrics_daily completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_team_metrics_daily');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_contact_aum_summary
   */
  async refreshContactAumSummary(): Promise<void> {
    logger.info('🔄 Refrescando mv_contact_aum_summary...');
    
    try {
      await db().execute(sql`SELECT refresh_mv_contact_aum_summary()`);
      logger.info('✅ Refresh de mv_contact_aum_summary completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_contact_aum_summary');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_portfolio_deviation_summary
   */
  async refreshPortfolioDeviationSummary(): Promise<void> {
    logger.info('🔄 Refrescando mv_portfolio_deviation_summary...');
    
    try {
      await db().execute(sql`SELECT refresh_mv_portfolio_deviation_summary()`);
      logger.info('✅ Refresh de mv_portfolio_deviation_summary completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_portfolio_deviation_summary');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_dashboard_kpis_daily
   */
  async refreshDashboardKpis(): Promise<void> {
    logger.info('🔄 Refrescando mv_dashboard_kpis_daily...');
    
    try {
      await db().execute(sql`SELECT refresh_mv_dashboard_kpis_daily()`);
      logger.info('✅ Refresh de mv_dashboard_kpis_daily completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_dashboard_kpis_daily');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_contact_pipeline_metrics
   */
  async refreshContactPipelineMetrics(): Promise<void> {
    logger.info('🔄 Refrescando mv_contact_pipeline_metrics...');
    
    try {
      await db().execute(sql`SELECT refresh_mv_contact_pipeline_metrics()`);
      logger.info('✅ Refresh de mv_contact_pipeline_metrics completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_contact_pipeline_metrics');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_task_metrics_by_advisor
   */
  async refreshTaskMetrics(): Promise<void> {
    logger.info('🔄 Refrescando mv_task_metrics_by_advisor...');
    
    try {
      await db().execute(sql`SELECT refresh_mv_task_metrics_by_advisor()`);
      logger.info('✅ Refresh de mv_task_metrics_by_advisor completado');
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_task_metrics_by_advisor');
      throw error;
    }
  }
}

