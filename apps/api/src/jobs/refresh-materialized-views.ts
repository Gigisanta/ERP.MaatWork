/**
 * Job para refrescar materialized views
 *
 * Refresca las materialized views que pre-calculan agregaciones frecuentes
 * para mejorar el rendimiento de queries.
 *
 * Se ejecuta:
 * - Diariamente después del job de valuación
 * - Después de imports AUM (refresh incremental de mv_contact_aum_summary)
 *
 * AI_DECISION: Las funciones de refresh son opcionales
 * Justificación: Las materialized views avanzadas (dashboard_kpis, pipeline_metrics, task_metrics)
 * son optimizaciones que se agregan post-deploy. El código no debe fallar si no existen.
 * Impacto: App funciona sin materialized views opcionales, solo loguea warning
 */

import { db } from '@maatwork/db';
import { sql } from 'drizzle-orm';
import pino from 'pino';

const logger = pino({ name: 'refresh-materialized-views' });

/**
 * Verificar si una función de PostgreSQL existe
 */
async function functionExists(functionName: string): Promise<boolean> {
  try {
    const result = await db().execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = ${functionName}
      ) as exists
    `);
    return (result.rows[0] as { exists: boolean }).exists;
  } catch {
    return false;
  }
}

export class RefreshMaterializedViewsJob {
  /**
   * Refrescar todas las materialized views (básicas de 0028)
   */
  async refreshAll(): Promise<void> {
    logger.info('🔄 Iniciando refresh de todas las materialized views...');

    try {
      if (await functionExists('refresh_all_materialized_views')) {
        await db().execute(sql`SELECT refresh_all_materialized_views()`);
        logger.info('✅ Refresh de todas las materialized views completado');
      } else {
        logger.warn('⚠️ Función refresh_all_materialized_views no existe, saltando');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando materialized views');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_team_metrics_daily (básica de 0028)
   */
  async refreshTeamMetrics(): Promise<void> {
    logger.info('🔄 Refrescando mv_team_metrics_daily...');

    try {
      if (await functionExists('refresh_mv_team_metrics_daily')) {
        await db().execute(sql`SELECT refresh_mv_team_metrics_daily()`);
        logger.info('✅ Refresh de mv_team_metrics_daily completado');
      } else {
        logger.warn('⚠️ Función refresh_mv_team_metrics_daily no existe, saltando');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_team_metrics_daily');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_contact_aum_summary (básica de 0028)
   */
  async refreshContactAumSummary(): Promise<void> {
    logger.info('🔄 Refrescando mv_contact_aum_summary...');

    try {
      if (await functionExists('refresh_mv_contact_aum_summary')) {
        await db().execute(sql`SELECT refresh_mv_contact_aum_summary()`);
        logger.info('✅ Refresh de mv_contact_aum_summary completado');
      } else {
        logger.warn('⚠️ Función refresh_mv_contact_aum_summary no existe, saltando');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_contact_aum_summary');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_portfolio_deviation_summary (básica de 0028)
   */
  async refreshPortfolioDeviationSummary(): Promise<void> {
    logger.info('🔄 Refrescando mv_portfolio_deviation_summary...');

    try {
      if (await functionExists('refresh_mv_portfolio_deviation_summary')) {
        await db().execute(sql`SELECT refresh_mv_portfolio_deviation_summary()`);
        logger.info('✅ Refresh de mv_portfolio_deviation_summary completado');
      } else {
        logger.warn('⚠️ Función refresh_mv_portfolio_deviation_summary no existe, saltando');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_portfolio_deviation_summary');
      throw error;
    }
  }

  /**
   * Refrescar solo mv_dashboard_kpis_daily (opcional, post-deploy)
   * NOTA: Esta función solo existe si se aplicó la migración de optimización post-deploy
   */
  async refreshDashboardKpis(): Promise<void> {
    try {
      if (await functionExists('refresh_mv_dashboard_kpis_daily')) {
        logger.info('🔄 Refrescando mv_dashboard_kpis_daily...');
        await db().execute(sql`SELECT refresh_mv_dashboard_kpis_daily()`);
        logger.info('✅ Refresh de mv_dashboard_kpis_daily completado');
      } else {
        logger.debug('mv_dashboard_kpis_daily no disponible (optimización post-deploy)');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_dashboard_kpis_daily');
      // No throw - es opcional
    }
  }

  /**
   * Refrescar solo mv_contact_pipeline_metrics (opcional, post-deploy)
   * NOTA: Esta función solo existe si se aplicó la migración de optimización post-deploy
   */
  async refreshContactPipelineMetrics(): Promise<void> {
    try {
      if (await functionExists('refresh_mv_contact_pipeline_metrics')) {
        logger.info('🔄 Refrescando mv_contact_pipeline_metrics...');
        await db().execute(sql`SELECT refresh_mv_contact_pipeline_metrics()`);
        logger.info('✅ Refresh de mv_contact_pipeline_metrics completado');
      } else {
        logger.debug('mv_contact_pipeline_metrics no disponible (optimización post-deploy)');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_contact_pipeline_metrics');
      // No throw - es opcional
    }
  }

  /**
   * Refrescar solo mv_task_metrics_by_advisor (opcional, post-deploy)
   * NOTA: Esta función solo existe si se aplicó la migración de optimización post-deploy
   */
  async refreshTaskMetrics(): Promise<void> {
    try {
      if (await functionExists('refresh_mv_task_metrics_by_advisor')) {
        logger.info('🔄 Refrescando mv_task_metrics_by_advisor...');
        await db().execute(sql`SELECT refresh_mv_task_metrics_by_advisor()`);
        logger.info('✅ Refresh de mv_task_metrics_by_advisor completado');
      } else {
        logger.debug('mv_task_metrics_by_advisor no disponible (optimización post-deploy)');
      }
    } catch (error) {
      logger.error({ err: error }, '❌ Error refrescando mv_task_metrics_by_advisor');
      // No throw - es opcional
    }
  }
}
