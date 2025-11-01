import { db } from './index';
import { 
  benchmarkDefinitions, 
  benchmarkComponents, 
  instruments, 
  metricDefinitions,
  lookupAssetClass 
} from './schema';
import { type InferSelectModel } from 'drizzle-orm';

export async function seedBenchmarks() {
  console.log('🌱 Seeding benchmarks and instruments...');

  // 1. Seed asset classes
  await db().insert(lookupAssetClass).values([
    { id: 'equity', label: 'Equity (Acciones)' },
    { id: 'fixed_income', label: 'Fixed Income (Renta Fija)' },
    { id: 'commodities', label: 'Commodities (Commodities)' },
    { id: 'cash', label: 'Cash (Efectivo)' },
    { id: 'alternatives', label: 'Alternatives (Alternativas)' }
  ]).onConflictDoNothing();

  // 2. Seed instruments (con símbolos yfinance)
  const instrumentsData = [
    // Benchmarks argentinos
    { symbol: '^MERV', name: 'MERVAL Index', assetClass: 'equity', currency: 'ARS', isin: null, active: true },
    { symbol: '^IAMC', name: 'IAMC Index', assetClass: 'equity', currency: 'ARS', isin: null, active: true },
    { symbol: 'GGAL.BA', name: 'Grupo Financiero Galicia', assetClass: 'equity', currency: 'ARS', isin: 'ARDEUT110108', active: true },
    { symbol: 'PAMP.BA', name: 'Pampa Energía', assetClass: 'equity', currency: 'ARS', isin: 'ARPAMU110B56', active: true },
    { symbol: 'TXAR.BA', name: 'Ternium Argentina', assetClass: 'equity', currency: 'ARS', isin: 'ARTERA110157', active: true },
    
    // Benchmarks internacionales
    { symbol: '^GSPC', name: 'S&P 500 Index', assetClass: 'equity', currency: 'USD', isin: null, active: true },
    { symbol: '^IXIC', name: 'NASDAQ Composite', assetClass: 'equity', currency: 'USD', isin: null, active: true },
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'equity', currency: 'USD', isin: 'US4642876555', active: true },
    { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', assetClass: 'equity', currency: 'USD', isin: 'US4642876555', active: true },
    
    // Bonos argentinos
    { symbol: 'AL30D.BA', name: 'Bonos Ley Argentina 2030', assetClass: 'fixed_income', currency: 'ARS', isin: 'ARARGE3202A0', active: true },
    { symbol: 'GD30D.BA', name: 'Bonos Ley Argentina 2030 USD', assetClass: 'fixed_income', currency: 'USD', isin: 'ARARGE3202A0', active: true },
    
    // Bonos internacionales
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetClass: 'fixed_income', currency: 'USD', isin: 'US4642876555', active: true },
    { symbol: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', assetClass: 'fixed_income', currency: 'USD', isin: 'US4642876555', active: true },
    
    // Commodities
    { symbol: 'GLD', name: 'SPDR Gold Trust', assetClass: 'commodities', currency: 'USD', isin: 'US78462F1030', active: true },
    { symbol: 'SLV', name: 'iShares Silver Trust', assetClass: 'commodities', currency: 'USD', isin: 'US4642876555', active: true },
    
    // Cash equivalents
    { symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', assetClass: 'cash', currency: 'USD', isin: 'US4642876555', active: true }
  ];

  const insertedInstruments = await db().insert(instruments).values(instrumentsData).returning();

  // 3. Seed benchmarks
  const benchmarksData = [
    {
      code: 'MERVAL',
      name: 'MERVAL Index',
      description: 'Índice principal de la Bolsa de Buenos Aires',
      isSystem: true
    },
    {
      code: 'IAMC',
      name: 'IAMC Index',
      description: 'Índice IAMC - Institucional',
      isSystem: true
    },
    {
      code: 'SP500',
      name: 'S&P 500',
      description: 'Standard & Poor\'s 500 Index',
      isSystem: true
    },
    {
      code: 'MSCI_EM',
      name: 'MSCI Emerging Markets',
      description: 'MSCI Emerging Markets Index',
      isSystem: true
    },
    {
      code: 'BALANCED_AR',
      name: 'Cartera Balanceada Argentina',
      description: 'Cartera modelo balanceada 60/40 (Acciones/Bonos) Argentina',
      isSystem: true
    },
    {
      code: 'CONSERVATIVE_AR',
      name: 'Cartera Conservadora Argentina',
      description: 'Cartera modelo conservadora 40/60 (Acciones/Bonos) Argentina',
      isSystem: true
    },
    {
      code: 'AGGRESSIVE_AR',
      name: 'Cartera Agresiva Argentina',
      description: 'Cartera modelo agresiva 80/20 (Acciones/Bonos) Argentina',
      isSystem: true
    }
  ];

  const insertedBenchmarks = await db().insert(benchmarkDefinitions).values(benchmarksData).returning();

  // 4. Seed benchmark components
  const benchmarkComponentsData = [
    // MERVAL (100% MERVAL index)
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'MERVAL')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === '^MERV')!.id,
      weight: 1.0000
    },
    
    // S&P 500 (100% SP500 index)
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'SP500')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === '^GSPC')!.id,
      weight: 1.0000
    },
    
    // MSCI EM (100% EEM ETF)
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'MSCI_EM')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === 'EEM')!.id,
      weight: 1.0000
    },
    
    // Cartera Balanceada Argentina (60% MERVAL + 40% Bonos)
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'BALANCED_AR')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === '^MERV')!.id,
      weight: 0.6000
    },
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'BALANCED_AR')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === 'AL30D.BA')!.id,
      weight: 0.4000
    },
    
    // Cartera Conservadora Argentina (40% MERVAL + 60% Bonos)
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'CONSERVATIVE_AR')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === '^MERV')!.id,
      weight: 0.4000
    },
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'CONSERVATIVE_AR')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === 'AL30D.BA')!.id,
      weight: 0.6000
    },
    
    // Cartera Agresiva Argentina (80% MERVAL + 20% Bonos)
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'AGGRESSIVE_AR')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === '^MERV')!.id,
      weight: 0.8000
    },
    {
      benchmarkId: insertedBenchmarks.find((b: InferSelectModel<typeof benchmarkDefinitions>) => b.code === 'AGGRESSIVE_AR')!.id,
      instrumentId: insertedInstruments.find((i: InferSelectModel<typeof instruments>) => i.symbol === 'AL30D.BA')!.id,
      weight: 0.2000
    }
  ];

  await db().insert(benchmarkComponents).values(benchmarkComponentsData);

  // 5. Seed metric definitions
  const metricsData = [
    {
      code: 'twr',
      name: 'Time-Weighted Return',
      description: 'Retorno ponderado por tiempo, elimina el efecto de los flujos de caja',
      calculationFormula: 'TWR = ∏(1 + ri) - 1 donde ri son los retornos por período',
      unit: '%',
      category: 'performance'
    },
    {
      code: 'volatility',
      name: 'Volatilidad',
      description: 'Desviación estándar de los retornos',
      calculationFormula: 'σ = √(Σ(ri - r̄)² / (n-1))',
      unit: '%',
      category: 'risk'
    },
    {
      code: 'sharpe',
      name: 'Sharpe Ratio',
      description: 'Retorno excedente por unidad de riesgo',
      calculationFormula: 'Sharpe = (rp - rf) / σp',
      unit: 'ratio',
      category: 'risk'
    },
    {
      code: 'drawdown',
      name: 'Maximum Drawdown',
      description: 'Máxima pérdida desde un pico histórico',
      calculationFormula: 'MDD = max(0, (Peak - Trough) / Peak)',
      unit: '%',
      category: 'risk'
    },
    {
      code: 'alpha',
      name: 'Alpha',
      description: 'Retorno excedente vs benchmark ajustado por riesgo',
      calculationFormula: 'α = rp - (rf + β * (rm - rf))',
      unit: '%',
      category: 'benchmark'
    },
    {
      code: 'beta',
      name: 'Beta',
      description: 'Sensibilidad de la cartera vs benchmark',
      calculationFormula: 'β = Cov(rp, rm) / Var(rm)',
      unit: 'ratio',
      category: 'benchmark'
    },
    {
      code: 'te',
      name: 'Tracking Error',
      description: 'Desviación estándar de la diferencia de retornos vs benchmark',
      calculationFormula: 'TE = σ(rp - rm)',
      unit: '%',
      category: 'benchmark'
    },
    {
      code: 'ir',
      name: 'Information Ratio',
      description: 'Alpha dividido por Tracking Error',
      calculationFormula: 'IR = α / TE',
      unit: 'ratio',
      category: 'benchmark'
    }
  ];

  await db().insert(metricDefinitions).values(metricsData);

  console.log('✅ Benchmarks and instruments seeded successfully!');
  console.log(`   - ${instrumentsData.length} instruments created`);
  console.log(`   - ${benchmarksData.length} benchmarks created`);
  console.log(`   - ${benchmarkComponentsData.length} benchmark components created`);
  console.log(`   - ${metricsData.length} metric definitions created`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedBenchmarks()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}
