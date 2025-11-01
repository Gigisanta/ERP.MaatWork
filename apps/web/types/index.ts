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
  UserApiResponse,
  UserWithTeam,
  Advisor,
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
  BenchmarkComponentForm,
  CreateBenchmarkRequest,
  UpdateBenchmarkRequest,
  AddBenchmarkComponentRequest,
  BenchmarkWithComponents,
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
  DashboardKPIs,
  DashboardData
} from './analytics';

// Team types
export type {
  Team,
  TeamMember,
  TeamAdvisor,
  MembershipRequest,
  TeamInvitation,
  TeamInvitationResponse
} from './team';

// Contact types
export type {
  Contact,
  ContactFieldValue,
  ContactFieldName,
  ContactFieldUpdate,
  CreateContactRequest,
  UpdateContactRequest
} from './contact';

// Pipeline types
export type {
  PipelineStage,
  PipelineStageWithContacts,
  PipelineBoard
} from './pipeline';

// Tag types
export type {
  Tag,
  CreateTagRequest,
  UpdateTagRequest
} from './tag';

// Broker Account types
export type {
  BrokerAccount,
  CreateBrokerAccountRequest
} from './broker-account';

// Task types
export type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest
} from './task';

// Note types
export type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest
} from './note';

// AUM types
export type {
  AumFile,
  AumRow,
  DuplicateRow,
  Row,
  AumUploadSummary,
  AumUploadResponse,
  AumMatchRequest,
  AumRowsResponse,
  AumDuplicatesResponse,
  ApiErrorWithMessage
} from './aum';

// Portfolio Assignment types
export type {
  PortfolioAssignment,
  AssignPortfolioRequest,
  AssignPortfolioResponse
} from './portfolio-assignment';

