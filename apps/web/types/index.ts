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
  LoadingState,
  ComponentBase,
  ApiError,
  ApiResponseWithHint
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
  TeamInvitationResponse,
  TeamMetrics,
  TeamMemberMetrics,
  AumTrendItem
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
  UpdateTagRequest,
  ContactTag,
  ContactTagWithDetails,
  UpdateContactTagRequest
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

// Metrics types
export type {
  BusinessLine,
  MonthlyMetrics,
  BusinessLineClosures,
  StageTransitionTime,
  MonthlyGoal,
  SaveMonthlyGoalRequest,
  ContactsMetricsResponse
} from './metrics';

// Capacitaciones types
export type {
  Capacitacion,
  CreateCapacitacionRequest,
  UpdateCapacitacionRequest,
  ImportCapacitacionesResponse,
  ListCapacitacionesParams,
  CapacitacionesListResponse
} from './capacitaciones';

// Automation types
export type {
  AutomationConfig,
  TriggerConfig,
  AutomationConfigData,
  CreateAutomationConfigRequest,
  UpdateAutomationConfigRequest
} from './automation';

