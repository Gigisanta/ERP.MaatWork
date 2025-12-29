/**
 * @maatwork/types - Shared TypeScript Types
 *
 * This package provides shared type definitions used across
 * both API (apps/api) and Web (apps/web) applications.
 *
 * Usage:
 * ```typescript
 * import { Contact, Team, UserRole } from '@maatwork/types';
 * ```
 */

// Common types
export type {
  BaseEntity,
  TimestampedEntity,
  TimestampedEntityOptional,
  SoftDeletableEntity,
  VersionedEntity,
  CreateRequest,
  UpdateRequest,
  ApiResponse,
  ApiErrorWithMessage,
  PaginatedResponse,
  UserRole,
  RiskProfile,
  ActiveStatus,
  ApprovalStatus,
  BusinessLine,
} from './common';

// Domain types - User
export type {
  User,
  UserApiResponse,
  UserWithTeam,
  AdvisorMinimal,
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from './user';

// Domain types - Contact
export type {
  ContactTag,
  ContactTagWithInfo,
  MeetingStatus,
  ContactMeetingStatus,
  ContactFieldValue,
  Contact,
  ContactWithTags,
  ContactFieldName,
  ContactFieldUpdate,
  CreateContactRequest,
  UpdateContactRequest,
  ImportStats,
  ContactUpdateFields,
  TimelineItem,
} from './contact';

// Domain types - Team
export type {
  TeamMemberRole,
  Team,
  TeamMember,
  TeamAdvisor,
  MembershipRequestStatus,
  MembershipRequest,
  TeamInvitationStatus,
  TeamInvitation,
  TeamInvitationResponse,
  TeamMetrics,
  RiskDistributionItem,
  AumTrendItem,
  TeamMemberMetrics,
  TeamMemberActivity,
  TeamGoal,
  SetTeamGoalRequest,
  StalledLead,
  ReassignLeadsRequest,
  TeamCapacityMember,
  PendingInvite,
} from './team';

// Domain types - Career Plan
export type {
  CareerPlanLevel,
  CareerPlanLevelCreateRequest,
  CareerPlanLevelUpdateRequest,
  UserCareerProgress,
} from './career-plan';

// Domain types - AUM
export type {
  AumMatchStatus,
  AumTotals,
  AumFile,
  AumContactInfo,
  AumUserInfo,
  AumRow,
  Row,
  DuplicateRow,
  AumUploadSummary,
  AumConfirmation,
  AumUploadResponse,
  AumMatchRequest,
  AumRowsResponse,
  AumDuplicatesResponse,
  AumRowInsert,
  UpsertStats,
  UpsertResult,
  AumMonthlySnapshotInsert,
} from './aum';

// Domain types - Calendar
export type {
  CalendarEventTime,
  CalendarEventAttendee,
  CalendarEvent,
  CalendarListEntry,
  GetEventsParams,
  CreateEventRequest,
  UpdateEventRequest,
  ConnectTeamCalendarRequest,
  ConnectTeamCalendarResponse,
  ListCalendarEventsRequest,
  UpdateCalendarEventRequest,
} from './calendar';

// Domain types - Tag
export type {
  Tag,
  CreateTagRequest,
  UpdateTagRequest,
  ContactTagRelation,
  ContactTagWithDetails,
  UpdateContactTagRequest,
} from './tag';

// Domain types - Pipeline
export type {
  PipelineStage,
  PipelineStageWithContacts,
  PipelineBoard,
} from './pipeline';

// Domain types - Broker Account
export type {
  BrokerAccount,
  CreateBrokerAccountRequest,
} from './broker-account';

// Domain types - Portfolio Assignment
export type {
  PortfolioAssignmentStatus,
  PortfolioAssignment,
  AssignPortfolioRequest,
  AssignPortfolioResponse,
} from './portfolio-assignment';

// Domain types - Task
export type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
} from './task';

// Domain types - Note
export type {
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
} from './note';

// Domain types - Capacitacion
export type {
  Capacitacion,
  CreateCapacitacionRequest,
  UpdateCapacitacionRequest,
  ImportCapacitacionesResponse,
  ListCapacitacionesParams,
  CapacitacionesListResponse,
} from './capacitacion';
