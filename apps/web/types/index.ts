/**
 * Barrel export para todos los tipos
 * 
 * Uso:
 *   import type { Portfolio, Benchmark, ApiResponse } from '@/types';
 */

// Common types
export type {
  ApiResponse,
  Pagination,
  PaginatedResponse,
  FilterOptions,
  RiskLevel,
  AssetType,
  Currency,
  TimePeriod,
  ToastVariant,
  LoadingState
} from './common';

// Auth types
export type {
  User,
  UserRole,
  AuthResponse,
  LoginCredentials,
  RegisterData
} from './auth';

// Instrument types
export type {
  Instrument,
  InstrumentSearchResult,
  InstrumentValidation,
  CreateInstrumentRequest,
  CreateInstrumentResponse,
  PriceSnapshot
} from './instrument';

// Portfolio types
export type {
  Portfolio,
  PortfolioLine,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  AddPortfolioLineRequest,
  PortfolioWithLines,
  PortfolioComponent,
  PortfolioFormData
} from './portfolio';

// Benchmark types
export type {
  Benchmark,
  BenchmarkType,
  BenchmarkComponent,
  CreateBenchmarkRequest,
  UpdateBenchmarkRequest,
  AddBenchmarkComponentRequest,
  BenchmarkWithComponents,
  BenchmarkComponentForm,
  BenchmarkFormData
} from './benchmark';

// Analytics types
export type {
  PerformanceMetrics,
  PerformanceDataPoint,
  PortfolioPerformance,
  ComparisonResult,
  CompareRequest,
  CompareResponse,
  DashboardKPIs
} from './analytics';

