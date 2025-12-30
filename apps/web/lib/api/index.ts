/**
 * API Module - Barrel Export
 *
 * Exports all API functions and the ApiClient:
 *
 * Client components (refactored from api-client.ts):
 * - client.ts - Main ApiClient class
 * - auth-manager.ts - Token refresh management
 * - retry-handler.ts - Retry logic with exponential backoff
 * - request-builder.ts - Header building, body serialization
 * - types.ts - Shared types
 *
 * Domain-specific API functions:
 * - analytics.ts, aum.ts, automations.ts, benchmarks.ts, bloomberg.ts
 * - broker-accounts.ts, capacitaciones.ts, career-plan.ts, contacts.ts
 * - instruments.ts, metrics.ts, notes.ts, notifications.ts, pipeline.ts
 * - portfolios.ts, settings.ts, tags.ts, tasks.ts, teams.ts, users.ts
 *
 * AI_DECISION: Reemplazar export * con exports específicos
 * Justificación: Mejora tree-shaking, reduce bundle size, cumple reglas ESLint
 * Impacto: Mejor optimización de bundle, imports más explícitos
 */

// ApiClient and related
export { ApiClient, apiClient } from './client';

// Re-export commonly used items from api-error
export { ApiError } from '../api-error';
export type { ApiResponse } from '@/types';

// ==========================================================
// Domain-specific API Functions
// ==========================================================

export { getTeamEvents, type CalendarListEntry } from './calendar';

export {
  uploadAumFile,
  getAumFilePreview,
  getAumFileExportUrl,
  matchAumRow,
  getAumDuplicates,
  commitAumFile,
  uploadAdvisorMapping,
} from './aum';

export {
  getBenchmarks,
  getBenchmarkComponentsBatch,
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
} from './benchmarks';

export { createBrokerAccount, deleteBrokerAccount } from './broker-accounts';

export {
  createCapacitacion,
  updateCapacitacion,
  deleteCapacitacion,
  importCapacitacionesCSV,
} from './capacitaciones';

export {
  createContact,
  deleteContact,
  updateContactField,
  assignPortfolioToContact,
  removePortfolioAssignment,
  updatePortfolioAssignmentStatus,
  importContactsCsv,
} from './contacts';

export { searchInstruments, getInstruments, createInstrument } from './instruments';

export { createNote, deleteNote } from './notes';

export { moveContactToStage } from './pipeline';

export {
  getPortfolios,
  getPortfolioById,
  getPortfolioLinesBatch,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addPortfolioLine,
  deletePortfolioLine,
} from './portfolios';

export { createTag, updateTag, deleteTag, updateContactTags } from './tags';

export { createTask, deleteTask } from './tasks';

export {
  getTeams,
  getTeamById,
  getTeamDetail,
  getTeamMemberById,
  createTeam,
  updateTeam,
  deleteTeam,
  removeTeamMember,
  getTeamAdvisors,
  createTeamInvitation,
  respondToMembershipRequest,
  getPendingInvitations,
  respondToInvitation,
  inviteTeamMember,
  getAllTeamMembers,
  getTeamMemberMetrics,
} from './teams';

export {
  getCurrentUser,
  updateUserProfile,
  changePassword,
  getManagers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  approveUser,
  rejectUser,
} from './users';
