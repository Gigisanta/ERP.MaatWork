/**
 * Barrel export para todos los tipos
 *
 * Uso:
 *   import type { Portfolio, Benchmark, ApiResponse } from '@/types';
 */

// Common types
export type {
  ApiResponse,
  PaginatedResponse,
  RiskLevel,
  AssetType,
  Currency,
  TimePeriod,
  ApiError,
  ApiResponseWithHint,
  ApiErrorWithMessage,
} from './common';

// Auth types
export type { UserRole, UserApiResponse, AdvisorMinimal as Advisor } from '@maatwork/types';

// Instrument types
export type {
  Instrument,
  InstrumentSearchResult,
  InstrumentValidation,
  CreateInstrumentRequest,
  CreateInstrumentResponse,
} from './instrument';

// Portfolio types
export type {
  Portfolio,
  PortfolioLine,
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  AddPortfolioLineRequest,
  PortfolioWithLines,
} from './portfolio';

// Benchmark types
export type {
  Benchmark,
  BenchmarkComponent,
  CreateBenchmarkRequest,
  UpdateBenchmarkRequest,
  AddBenchmarkComponentRequest,
  BenchmarkWithComponents,
} from './benchmark';

// Analytics types
export type {
  PerformanceDataPoint,
  PortfolioPerformance,
  ComparisonResult,
  CompareRequest,
  CompareResponse,
  DashboardKPIs,
  DashboardData,
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
  TeamMemberActivity,
  AumTrendItem,
  TeamGoal,
  SetTeamGoalRequest,
  StalledLead,
  ReassignLeadsRequest,
  TeamCapacityMember,
} from '@maatwork/types';

// Contact types
export type { Contact, ContactWithTags, ContactFieldValue, ImportStats } from '@maatwork/types';

// Pipeline types
export type { PipelineStage, PipelineStageWithContacts, PipelineBoard } from '@maatwork/types';

// Tag types
export type {
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  ContactTagWithDetails,
  UpdateContactTagRequest,
} from '@maatwork/types';

// Broker Account types
export type { BrokerAccount, CreateBrokerAccountRequest } from '@maatwork/types';

// Task types
export type { Task, CreateTaskRequest, UpdateTaskRequest } from '@maatwork/types';

// Note types
export type { Note, CreateNoteRequest, UpdateNoteRequest } from '@maatwork/types';

// AUM types
export type {
  AumFile,
  AumRow,
  Row,
  AumUploadResponse,
  AumMatchRequest,
  AumRowsResponse,
  AumDuplicatesResponse,
} from '@maatwork/types';

// Portfolio Assignment types
export type {
  PortfolioAssignment,
  AssignPortfolioRequest,
  AssignPortfolioResponse,
} from '@maatwork/types';

// Metrics types
// Capacitaciones types
export type {
  Capacitacion,
  CreateCapacitacionRequest,
  UpdateCapacitacionRequest,
  ImportCapacitacionesResponse,
  ListCapacitacionesParams,
  CapacitacionesListResponse,
} from '@maatwork/types';

// Automation types
// Calendar types
export type {
  CalendarEvent,
  CalendarEventAttendee,
  CalendarListEntry,
  GetEventsParams,
  CreateEventRequest,
  UpdateEventRequest,
  ConnectTeamCalendarRequest,
  ConnectTeamCalendarResponse,
} from '@maatwork/types';

// Career Plan types
export type {
  CareerPlanLevel,
  CareerPlanLevelCreateRequest,
  CareerPlanLevelUpdateRequest,
  UserCareerProgress,
} from '@maatwork/types';

// Feedback types
export type {
  FeedbackType,
  FeedbackStatus,
  Feedback,
  FeedbackListResponse,
  CreateFeedbackRequest,
  UpdateFeedbackStatusRequest,
} from '@maatwork/types';
