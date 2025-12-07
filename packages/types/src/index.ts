/**
 * @cactus/types - Shared TypeScript Types
 * 
 * This package provides shared type definitions used across
 * both API (apps/api) and Web (apps/web) applications.
 * 
 * Usage:
 * ```typescript
 * import { Contact, Team, UserRole } from '@cactus/types';
 * import type { ContactWithTags } from '@cactus/types/contact';
 * import type { TeamMetrics } from '@cactus/types/team';
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
  PaginatedResponse,
  UserRole,
  RiskProfile,
  ActiveStatus,
  ApprovalStatus
} from './common';

// Domain types - Contact
export type {
  ContactTag,
  ContactFieldValue,
  Contact,
  ContactWithTags,
  ContactFieldName,
  ContactFieldUpdate,
  CreateContactRequest,
  UpdateContactRequest
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
  TeamMetrics,
  RiskDistributionItem,
  AumTrendItem,
  TeamMemberMetrics
} from './team';

