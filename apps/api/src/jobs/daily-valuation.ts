import { db } from '@cactus/db';
import { 
  instruments, 
  priceSnapshots, 
  brokerPositions, 
  brokerBalances,
  brokerAccounts,
  aumSnapshots,
  clientPortfolioAssignments,
  portfolioMonitoringSnapshot,
  portfolioMonitoringDetails,
  portfolioTemplateLines,
  contacts
} from '@cactus/db/schema';
import { eq, and, sql, desc, gte, lte, sum, type InferSelectModel } from 'drizzle-orm';
import axios from 'axios';
import pino from 'pino';
import { PositionWithMarketValue } from '../types/daily-valuation';
import { CircuitBreaker, CircuitBreakerOpenError } from '../utils/circuit-breaker';

const logger = pino({ name: 'daily-valuation' });

// Tipos inferidos del schema
type Instrument = InferSelectModel<typeof instruments>;
type InstrumentSelect = Pick<Instrument, 'id' | 'symbol' | 'name' | 'currency'>;

interface PriceData {
  [symbol: string]: {
    price: number;
    currency: string;
    date: string;
    source: string;
    success: boolean;
    error?: string;
  };
}

interface YFinanceResponse {
  success: boolean;
  data: PriceData;
  timestamp: string;
  count: number;
}

/**
 * Job diario de valuación de carteras
 * - Obtiene precios actuales de instrumentos activos
 * - Calcula AUM por contacto
 * - Calcula desvíos de carteras vs objetivo
 * - Guarda snapshots para histórico
 */
export class DailyValuationJob {
  private analyticsServiceUrl: string;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3002';
    
    // AI_DECISION: Circuit breaker para microservicio de precios
    // Justificación: Previene llamadas repetidas cuando el servicio está caído
    // Permite fallback rápido a precios históricos
    // Impacto: Mejor resiliencia, menos carga en servicio fallido, recuperación automática
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,      // Abrir después de 5 fallos
      resetTimeout: 60000,      // Intentar half-open después de 60 segundos
      timeout: 30000,           // Timeout de 30 segundos por request
      successThreshold: 2       // Cerrar después de 2 éxitos en half-open
    });
  }

  /**
   * Ejecutar job completo de valuación
   */
  async run(): Promise<void> {
    logger.info('🚀 Iniciando job de valuación diaria...');
    
    try {
      // 1. Obtener instrumentos activos
      logger.info('📊 Obteniendo instrumentos activos...');
      const activeInstruments = await this.getActiveInstruments();
      
      if (activeInstruments.length === 0) {
        logger.warn('⚠️ No hay instrumentos activos para valuar');
        return;
      }

      logger.info({ count: activeInstruments.length }, '📈 Instrumentos activos encontrados');

      // 2. Obtener precios actuales del microservicio Python
      logger.info('💰 Obteniendo precios actuales...');
      const prices = await this.fetchCurrentPrices(activeInstruments);
      
      if (!prices || Object.keys(prices).length === 0) {
        logger.warn('⚠️ No se pudieron obtener precios');
        return;
      }

      logger.info({ count: Object.keys(prices).length }, '✅ Precios obtenidos');

      // 3. Guardar precios en price_snapshots
      logger.info('💾 Guardando snapshots de precios...');
      const today = new Date().toISOString().split('T')[0];
      await this.savePriceSnapshots(prices, today);

      // 4. Calcular AUM por contacto
      logger.info('📊 Calculando AUM por contacto...');
      await this.calculateAUMByContact(today);

      // 5. Calcular desvíos de carteras
      logger.info('📏 Calculando desvíos de carteras...');
      await this.calculatePortfolioDeviations(today);

      // 6. Refrescar materialized views después de cálculos
      logger.info('🔄 Refrescando materialized views...');
      const { RefreshMaterializedViewsJob } = await import('./refresh-materialized-views');
      const refreshJob = new RefreshMaterializedViewsJob();
      await refreshJob.refreshAll();

      logger.info('✅ Job de valuación diaria completado exitosamente');

    } catch (error) {
      logger.error({ err: error }, '❌ Error en job de valuación diaria');
      throw error;
    }
  }

  /**
   * Obtener instrumentos activos con sus símbolos
   */
  private async getActiveInstruments() {
    return await db()
      .select({
        id: instruments.id,
        symbol: instruments.symbol,
        name: instruments.name,
        currency: instruments.currency
      })
      .from(instruments)
      .where(eq(instruments.active, true));
  }

  /**
   * Obtener precios actuales del microservicio Python
   */
  private async fetchCurrentPrices(instrumentsList: InstrumentSelect[]): Promise<PriceData | null> {
    // Si el circuit breaker está abierto, usar fallback inmediato
    if (this.circuitBreaker.isOpen()) {
      logger.warn({
        circuitState: this.circuitBreaker.getState(),
        metrics: this.circuitBreaker.getMetrics()
      }, 'Circuit breaker OPEN - usando fallback inmediato');
      return await this.getLastAvailablePrices(instrumentsList);
    }

    try {
      // Ejecutar llamada protegida por circuit breaker
      const prices = await this.circuitBreaker.execute(async () => {
        const symbols = instrumentsList.map(inst => inst.symbol);
        
        const response = await axios.post<YFinanceResponse>(
          `${this.analyticsServiceUrl}/prices/fetch`,
          { symbols },
          {
            timeout: 30000, // 30 segundos timeout
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.data.success) {
          throw new Error('Error en respuesta del servicio de precios');
        }

        return response.data.data;
      });

      return prices;

    } catch (error) {
      // Si es CircuitBreakerOpenError, ya usamos fallback arriba
      if (error instanceof CircuitBreakerOpenError) {
        logger.warn('Circuit breaker abierto - usando fallback');
        return await this.getLastAvailablePrices(instrumentsList);
      }

      // Para otros errores, loguear y usar fallback
      logger.error({ 
        err: error,
        circuitState: this.circuitBreaker.getState(),
        metrics: this.circuitBreaker.getMetrics()
      }, 'Error obteniendo precios');
      
      // Si el circuit breaker se abrió debido a este error, usar fallback
      if (this.circuitBreaker.isOpen()) {
        logger.warn('🔄 Circuit breaker se abrió - usando últimos precios disponibles...');
        return await this.getLastAvailablePrices(instrumentsList);
      }

      // Si aún no está abierto pero falló, intentar fallback de todas formas
      logger.warn('🔄 Intentando usar últimos precios disponibles...');
      return await this.getLastAvailablePrices(instrumentsList);
    }
  }

  /**
   * Obtener últimos precios disponibles como fallback
   */
  private async getLastAvailablePrices(instrumentsList: InstrumentSelect[]): Promise<PriceData | null> {
    try {
      const instrumentIds = instrumentsList.map(inst => inst.id);
      
      // Obtener últimos precios por instrumento
      const lastPrices = await db()
        .select({
          instrumentId: priceSnapshots.instrumentId,
          symbol: instruments.symbol,
          closePrice: priceSnapshots.closePrice,
          currency: priceSnapshots.currency,
          asOfDate: priceSnapshots.asOfDate
        })
        .from(priceSnapshots)
        .innerJoin(instruments, eq(priceSnapshots.instrumentId, instruments.id))
        .where(sql`${priceSnapshots.instrumentId} = ANY(${instrumentIds})`)
        .orderBy(desc(priceSnapshots.asOfDate));

      // Agrupar por instrumento y tomar el más reciente
      type PriceSnapshot = {
        instrumentId: string;
        symbol: string;
        closePrice: string | null;
        currency: string;
        asOfDate: Date;
      };
      
      const latestPrices: Map<string, PriceSnapshot> = new Map();
      
      for (const price of lastPrices) {
        if (!latestPrices.has(price.instrumentId)) {
          latestPrices.set(price.instrumentId, price);
        }
      }

      // Convertir a formato esperado
      const result: PriceData = {};
      for (const price of latestPrices.values()) {
        result[price.symbol] = {
          price: Number(price.closePrice),
          currency: price.currency,
          date: price.asOfDate.toISOString(),
          source: 'fallback',
          success: true
        };
      }

      logger.info({ count: Object.keys(result).length }, '📈 Usando precios de fallback');
      return result;

    } catch (error) {
      logger.error({ err: error }, 'Error obteniendo precios de fallback');
      return null;
    }
  }

  /**
   * Guardar snapshots de precios en la base de datos
   */
  private async savePriceSnapshots(prices: PriceData, date: string): Promise<void> {
    const instrumentSymbols = Object.keys(prices);
    const instrumentsList = await db()
      .select({ id: instruments.id, symbol: instruments.symbol })
      .from(instruments)
      .where(sql`${instruments.symbol} = ANY(${instrumentSymbols})`);

    const snapshotsToInsert = [];

    for (const instrument of instrumentsList) {
      const priceData = prices[instrument.symbol];
      
      if (priceData && priceData.success) {
        snapshotsToInsert.push({
          instrumentId: instrument.id,
          asOfDate: date,
          closePrice: priceData.price,
          currency: priceData.currency,
          source: priceData.source
        });
      }
    }

    if (snapshotsToInsert.length > 0) {
      // Insertar con ON CONFLICT DO UPDATE
      await db()
        .insert(priceSnapshots)
        .values(snapshotsToInsert)
        .onConflictDoUpdate({
          target: [priceSnapshots.instrumentId, priceSnapshots.asOfDate],
          set: {
            closePrice: sql`EXCLUDED.close_price`,
            currency: sql`EXCLUDED.currency`,
            source: sql`EXCLUDED.source`
          }
        });

      logger.info({ count: snapshotsToInsert.length }, '💾 Snapshots de precios guardados');
    }
  }

  /**
   * Calcular AUM por contacto basado en posiciones y precios actuales
   */
  private async calculateAUMByContact(date: string): Promise<void> {
    try {
      // AI_DECISION: Usar agregación SQL (SUM + GROUP BY) en lugar de agrupar en memoria.
      // Esto reduce transferencia de datos desde DB y mejora performance al calcular AUM directamente en SQL.
      const aumByContact = await db()
        .select({
          contactId: brokerAccounts.contactId,
          aumTotal: sum(brokerPositions.marketValue)
        })
        .from(brokerPositions)
        .innerJoin(brokerAccounts, eq(brokerPositions.brokerAccountId, brokerAccounts.id))
        .innerJoin(instruments, eq(brokerPositions.instrumentId, instruments.id))
        .where(eq(brokerPositions.asOfDate, date))
        .groupBy(brokerAccounts.contactId);

      // Guardar snapshots de AUM
      const aumSnapshotsToInsert = aumByContact
        .filter((row: { contactId: string; aumTotal: string | null }) => row.aumTotal !== null)
        .map((row: { contactId: string; aumTotal: string | null }) => ({
          contactId: row.contactId,
          date,
          aumTotal: row.aumTotal as string // sum() retorna string para numeric
        }));

      if (aumSnapshotsToInsert.length > 0) {
        await db()
          .insert(aumSnapshots)
          .values(aumSnapshotsToInsert)
          .onConflictDoUpdate({
            target: [aumSnapshots.contactId, aumSnapshots.date],
            set: {
              aumTotal: sql`EXCLUDED.aum_total`
            }
          });

        logger.info({ count: aumSnapshotsToInsert.length }, '📊 AUM calculado para contactos');
        
        // Refresh materialized view after AUM calculation
        const { RefreshMaterializedViewsJob } = await import('./refresh-materialized-views');
        const refreshJob = new RefreshMaterializedViewsJob();
        await refreshJob.refreshContactAumSummary();
      }

    } catch (error) {
      logger.error({ err: error }, 'Error calculando AUM');
      throw error;
    }
  }

  /**
   * Calcular desvíos de carteras vs objetivo
   */
  private async calculatePortfolioDeviations(date: string): Promise<void> {
    try {
      // Obtener contactos con carteras asignadas activas
      const contactsWithPortfolios = await db()
        .select({
          contactId: clientPortfolioAssignments.contactId,
          templateId: clientPortfolioAssignments.templateId,
          assignmentId: clientPortfolioAssignments.id
        })
        .from(clientPortfolioAssignments)
        .where(and(
          eq(clientPortfolioAssignments.status, 'active'),
          lte(clientPortfolioAssignments.startDate, date),
          sql`(${clientPortfolioAssignments.endDate} IS NULL OR ${clientPortfolioAssignments.endDate} >= ${date})`
        ));

      logger.info({ count: contactsWithPortfolios.length }, '📏 Calculando desvíos');

      for (const contact of contactsWithPortfolios) {
        await this.calculateContactPortfolioDeviation(contact.contactId, contact.templateId, contact.assignmentId, date);
      }

      // Refresh materialized view after portfolio deviation calculation
      const { RefreshMaterializedViewsJob } = await import('./refresh-materialized-views');
      const refreshJob = new RefreshMaterializedViewsJob();
      await refreshJob.refreshPortfolioDeviationSummary();

    } catch (error) {
      logger.error({ err: error }, 'Error calculando desvíos de carteras');
      throw error;
    }
  }

  /**
   * Calcular desvío específico de un contacto
   */
  private async calculateContactPortfolioDeviation(
    contactId: string, 
    templateId: string, 
    assignmentId: string, 
    date: string
  ): Promise<void> {
    try {
      // Obtener composición objetivo de la plantilla
      const templateLines = await db()
        .select({
          targetType: portfolioTemplateLines.targetType,
          assetClass: portfolioTemplateLines.assetClass,
          instrumentId: portfolioTemplateLines.instrumentId,
          targetWeight: portfolioTemplateLines.targetWeight
        })
        .from(portfolioTemplateLines)
        .where(eq(portfolioTemplateLines.templateId, templateId));

      // Obtener posiciones actuales del contacto
      const currentPositions = await db()
        .select({
          instrumentId: brokerPositions.instrumentId,
          marketValue: brokerPositions.marketValue
        })
        .from(brokerPositions)
        .innerJoin(brokerAccounts, eq(brokerPositions.brokerAccountId, brokerAccounts.id))
        .where(and(
          eq(brokerAccounts.contactId, contactId),
          eq(brokerPositions.asOfDate, date)
        ));

      // Calcular AUM total del contacto
      const totalAUM = currentPositions.reduce((sum: number, pos: PositionWithMarketValue) => sum + Number(pos.marketValue || 0), 0);

      if (totalAUM === 0) {
        logger.warn({ contactId }, '⚠️ Contacto sin AUM para calcular desvíos');
        return;
      }

      // Calcular pesos actuales
      const actualWeights: { [key: string]: number } = {};
      for (const position of currentPositions) {
        const weight = Number(position.marketValue || 0) / totalAUM;
        actualWeights[position.instrumentId] = weight;
      }

      // Calcular desvíos por línea de plantilla
      let totalDeviation = 0;
      const deviationDetails = [];

      for (const line of templateLines) {
        const targetWeight = Number(line.targetWeight);
        const actualWeight = actualWeights[line.instrumentId || ''] || 0;
        const deviation = actualWeight - targetWeight;

        totalDeviation += Math.abs(deviation);

        deviationDetails.push({
          targetType: line.targetType,
          assetClass: line.assetClass,
          instrumentId: line.instrumentId,
          targetWeight,
          actualWeight,
          deviationPct: deviation
        });
      }

      // Guardar snapshot de monitoreo
      await db()
        .insert(portfolioMonitoringSnapshot)
        .values({
          contactId,
          asOfDate: date,
          totalDeviationPct: totalDeviation
        })
        .onConflictDoUpdate({
          target: [portfolioMonitoringSnapshot.contactId, portfolioMonitoringSnapshot.asOfDate],
          set: {
            totalDeviationPct: sql`EXCLUDED.total_deviation_pct`
          }
        });

      // Guardar detalles de desvío
      if (deviationDetails.length > 0) {
        // Eliminar detalles previos para esta fecha
        await db()
          .delete(portfolioMonitoringDetails)
          .where(eq(portfolioMonitoringDetails.snapshotId, 
            sql`(SELECT id FROM ${portfolioMonitoringSnapshot} WHERE contact_id = ${contactId} AND as_of_date = ${date})`
          ));

        // Insertar nuevos detalles
        const snapshotId = await db()
          .select({ id: portfolioMonitoringSnapshot.id })
          .from(portfolioMonitoringSnapshot)
          .where(and(
            eq(portfolioMonitoringSnapshot.contactId, contactId),
            eq(portfolioMonitoringSnapshot.asOfDate, date)
          ))
          .limit(1);

        if (snapshotId.length > 0) {
          const detailsToInsert = deviationDetails.map(detail => ({
            snapshotId: snapshotId[0].id,
            targetType: detail.targetType,
            assetClass: detail.assetClass,
            instrumentId: detail.instrumentId,
            targetWeight: detail.targetWeight,
            actualWeight: detail.actualWeight,
            deviationPct: detail.deviationPct
          }));

          await db()
            .insert(portfolioMonitoringDetails)
            .values(detailsToInsert);
        }
      }

    } catch (error) {
      console.error(`Error calculando desvío para contacto ${contactId}:`, error);
      // No lanzar error para no interrumpir el procesamiento de otros contactos
    }
  }
}

// Función para ejecutar el job manualmente
export async function runDailyValuationJob(): Promise<void> {
  const job = new DailyValuationJob();
  await job.run();
}

// Función para ejecutar backfill de precios históricos
export async function runPriceBackfillJob(days: number = 365): Promise<void> {
  logger.info({ days }, '🔄 Iniciando backfill de precios históricos');
  
  try {
    const job = new DailyValuationJob();
    const activeInstruments = await job['getActiveInstruments']();
    
    if (activeInstruments.length === 0) {
      logger.warn('⚠️ No hay instrumentos activos para backfill');
      return;
    }

    const symbols = activeInstruments.map((inst: InstrumentSelect) => inst.symbol);
    
    const response = await axios.post(
      `${job['analyticsServiceUrl']}/prices/backfill`,
      { symbols, days },
      {
        timeout: 300000, // 5 minutos timeout para backfill
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      throw new Error('Error en respuesta del servicio de backfill');
    }

    logger.info({ totalRecords: response.data.total_records, symbols: response.data.symbols_count }, '✅ Backfill completado');

    // Guardar datos históricos en price_snapshots
    const historicalData = response.data.data;
    
    type HistoricalRecord = {
      date: string;
      price: number;
      currency: string;
    };
    
    for (const [symbol, records] of Object.entries(historicalData)) {
      if (Array.isArray(records) && records.length > 0) {
        const instrument = activeInstruments.find((inst: InstrumentSelect) => inst.symbol === symbol);
        if (instrument) {
          const snapshotsToInsert = (records as HistoricalRecord[]).map((record: HistoricalRecord) => ({
            instrumentId: instrument.id,
            asOfDate: record.date,
            closePrice: record.price,
            currency: record.currency || instrument.currency || 'USD',
            source: 'yfinance'
          }));

          await db()
            .insert(priceSnapshots)
            .values(snapshotsToInsert)
            .onConflictDoNothing(); // Ignorar duplicados
        }
      }
    }

    logger.info('💾 Datos históricos guardados en price_snapshots');

  } catch (error) {
    logger.error({ err: error }, '❌ Error en backfill de precios');
    throw error;
  }
}
